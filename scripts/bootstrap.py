# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "zstandard",
#   "Pillow",
#   "texture2ddecoder",
# ]
# ///

from __future__ import annotations

import json
import os
import pty
import select
import shutil
import struct
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

ROOT       = Path(__file__).resolve().parent.parent
NSP_BASE   = ROOT / "game-data/tomodachi_life_base.nsp"
NSP_UPDATE = ROOT / "game-data/tomodachi_life_1.0.1.nsp"
NSTOOL     = ROOT / "game-data/nstool"
KEYS       = ROOT / "game-data/prod.keys"
OUT        = ROOT / "game-data/romfs"
NSTOOL_SRC = ROOT / "game-data/.nstool-src"
OEAD_SRC   = ROOT / "game-data/.oead-src"

OEAD_REPO   = "https://github.com/alexislours/oead"
OEAD_REF    = "158ea19649994b9fce0c1daa3b3b2802e89990d4"
NSTOOL_REPO = "https://github.com/jakcron/nstool"

WANTED_DIRS = ("Icon", "RSDB", "Mals", "WalkingGrid", "GameData")
MALS_KEEP   = ("ReplaceMsg", "ProgramMsg", "LayoutMsg")

_t0 = time.monotonic()


def log(stage: str, msg: str) -> None:
    print(f"[{stage}] +{time.monotonic() - _t0:6.1f}s  {msg}", flush=True)


def die(msg: str, code: int = 2) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


class NstoolError(RuntimeError):
    pass


_FATAL_MARKERS = (
    "[WARNING] Failed to extract",
    "AES-CTR Key was not determined",
    "[ERROR]",
)


def _run_pty(cmd: list[str]) -> tuple[list[str], int]:
    master, slave = pty.openpty()
    try:
        proc = subprocess.Popen(
            cmd, stdout=slave, stderr=slave, stdin=subprocess.DEVNULL, close_fds=True,
        )
    except Exception:
        os.close(master)
        os.close(slave)
        raise
    os.close(slave)

    lines: list[str] = []
    buf = bytearray()
    try:
        while True:
            r, _, _ = select.select([master], [], [], 0.2)
            if r:
                try:
                    chunk = os.read(master, 4096)
                except OSError:
                    break
                if not chunk:
                    break
                buf.extend(chunk)
                while True:
                    nl = buf.find(b"\n")
                    if nl < 0:
                        break
                    lines.append(bytes(buf[:nl]).decode("utf-8", "replace").rstrip("\r"))
                    del buf[: nl + 1]
            elif proc.poll() is not None:
                break
        if buf:
            lines.append(bytes(buf).decode("utf-8", "replace").rstrip("\r"))
    finally:
        os.close(master)
    return lines, proc.wait()


def nstool(args: list[str]) -> None:
    cmd = [str(NSTOOL), "-k", str(KEYS), *args]
    lines, rc = _run_pty(cmd)
    fatal = [ln for ln in lines if any(m in ln for m in _FATAL_MARKERS)]
    if rc != 0 or fatal:
        tail = "\n".join(lines[-20:])
        raise NstoolError(f"nstool failed (rc={rc}): {' '.join(cmd)}\n{tail}")


_CNMT_CONTENT_TYPES = {
    0: "Meta", 1: "Program", 2: "Data", 3: "Control",
    4: "HtmlDocument", 5: "LegalInformation", 6: "DeltaFragment",
}


def parse_cnmt(path: Path) -> dict[str, str]:
    data = path.read_bytes()
    _, _, _, _, ext_size, content_count, _, _, _, _, _ = struct.unpack_from(
        "<QIBBHHHB3sII", data, 0
    )
    offset = 0x20 + ext_size
    out: dict[str, str] = {}
    for _ in range(content_count):
        chunk = data[offset : offset + 0x38]
        nca_id = chunk[0x20:0x30].hex()
        ctype = _CNMT_CONTENT_TYPES.get(chunk[0x36], f"Unknown({chunk[0x36]})")
        out.setdefault(ctype, nca_id)
        offset += 0x38
    return out


@dataclass(frozen=True)
class SarcEntry:
    name: str
    offset: int
    size: int


def read_sarc(data: bytes) -> list[SarcEntry]:
    if len(data) < 0x14 or data[:4] != b"SARC":
        raise ValueError("not a SARC archive")
    _, hdr_size, bom, _file_size, data_offset, _ver, _ = struct.unpack_from(
        "<4sHHIIII", data, 0,
    )
    if bom != 0xFEFF:
        raise ValueError(f"unexpected SARC BOM: {bom:#x}")

    off = hdr_size
    sfat_magic, sfat_hdr, node_count, _hash_key = struct.unpack_from(
        "<4sHHI", data, off,
    )
    if sfat_magic != b"SFAT":
        raise ValueError("missing SFAT block")
    off += sfat_hdr

    nodes: list[tuple[int, int, int]] = []
    for _ in range(node_count):
        _hash, name_info, data_start, data_end = struct.unpack_from("<IIII", data, off)
        nodes.append((name_info, data_start, data_end))
        off += 16

    sfnt_magic, sfnt_hdr, _ = struct.unpack_from("<4sHH", data, off)
    if sfnt_magic != b"SFNT":
        raise ValueError("missing SFNT block")
    name_base = off + sfnt_hdr

    entries: list[SarcEntry] = []
    for i, (name_info, data_start, data_end) in enumerate(nodes):
        if name_info >> 24:
            name_off = (name_info & 0x00FFFFFF) * 4
            end = data.find(b"\x00", name_base + name_off)
            name = data[name_base + name_off : end].decode("utf-8", "replace")
        else:
            name = f"_anon_{i:05d}"
        entries.append(SarcEntry(name, data_offset + data_start, data_end - data_start))
    return entries


META_KEY = "__meta__"


@dataclass
class TagRegistry:
    group_names: dict[int, str]
    group_tags: dict[int, list[str]]

    @classmethod
    def empty(cls) -> "TagRegistry":
        return cls(group_names={}, group_tags={})

    def merge(self, other: "TagRegistry") -> None:
        for gid, gname in other.group_names.items():
            self.group_names.setdefault(gid, gname)
        for gid, tags in other.group_tags.items():
            existing = self.group_tags.get(gid)
            if existing is None or len(tags) > len(existing):
                self.group_tags[gid] = list(tags)


def _read_msbp_blocks(data: bytes) -> dict[bytes, bytes]:
    if data[:8] != b"MsgPrjBn":
        raise ValueError("not MSBP")
    if struct.unpack_from("<H", data, 8)[0] != 0xFEFF:
        raise ValueError("big-endian MSBP not supported")
    block_count = struct.unpack_from("<H", data, 0x0E)[0]
    blocks: dict[bytes, bytes] = {}
    off = 0x20
    for _ in range(block_count):
        if off + 0x10 > len(data):
            break
        magic = bytes(data[off : off + 4])
        block_size = struct.unpack_from("<I", data, off + 4)[0]
        blocks[magic] = data[off + 0x10 : off + 0x10 + block_size]
        off = (off + 0x10 + block_size + 0xF) & ~0xF
    return blocks


def _parse_count_offsets(body: bytes) -> tuple[int, list[int]]:
    count = struct.unpack_from("<H", body, 0)[0]
    offsets = list(struct.unpack_from(f"<{count}I", body, 4))
    return count, offsets


def _read_cstr_utf8(body: bytes, start: int) -> str:
    end = body.find(b"\x00", start)
    if end < 0:
        end = len(body)
    return body[start:end].decode("utf-8", "replace")


def parse_msbp(data: bytes) -> TagRegistry:
    blocks = _read_msbp_blocks(data)
    reg = TagRegistry.empty()

    tag2_names: list[str] = []
    if b"TAG2" in blocks:
        body = blocks[b"TAG2"]
        count, offsets = _parse_count_offsets(body)
        for i in range(count):
            start = offsets[i]
            pc = struct.unpack_from("<H", body, start)[0]
            tag2_names.append(_read_cstr_utf8(body, start + 2 + pc * 2))

    if b"TGG2" in blocks:
        body = blocks[b"TGG2"]
        count, offsets = _parse_count_offsets(body)
        for i in range(count):
            start = offsets[i]
            gi, tc = struct.unpack_from("<HH", body, start)
            idxs = list(struct.unpack_from(f"<{tc}H", body, start + 4))
            gname = _read_cstr_utf8(body, start + 4 + tc * 2)
            reg.group_names[gi] = gname
            reg.group_tags[gi] = [
                tag2_names[x] if x < len(tag2_names) else f"tag{x}"
                for x in idxs
            ]

    return reg


_TAG_RE = __import__("re").compile(r"<(\d+):(\d+)>")


def _resolve_open(reg: TagRegistry, group: int, tag: int) -> tuple[str, bool]:
    gname = reg.group_names.get(group)
    tags = reg.group_tags.get(group)
    if gname is None or tags is None or tag >= len(tags):
        return f"<{group}:{tag}>", False
    return f"<{gname}.{tags[tag]}>", True


def resolve_msbt_tags(messages: dict[str, dict], reg: TagRegistry) -> None:
    for label, entry in messages.items():
        if label == META_KEY or not isinstance(entry, dict):
            continue
        text = entry.get("text", "")
        if isinstance(text, str) and text:
            entry["text"] = _TAG_RE.sub(
                lambda m: _resolve_open(reg, int(m.group(1)), int(m.group(2)))[0],
                text,
            )
        for tag in entry.get("tags") or []:
            if "group" in tag and "type" in tag:
                rendered, ok = _resolve_open(reg, tag["group"], tag["type"])
                tag["name"] = rendered[1:-1] if ok else f'{tag["group"]}:{tag["type"]}'


_MSBP_REGISTRY: TagRegistry = TagRegistry.empty()


def _msbt_decode_utf16(raw: bytes) -> tuple[str, list[dict]]:
    out: list[str] = []
    tags: list[dict] = []
    i = 0
    n = len(raw)
    while i + 1 < n:
        cp = raw[i] | (raw[i + 1] << 8)
        if cp == 0x0000:
            break
        if cp == 0x000E and i + 8 <= n:
            g, t, psz = struct.unpack_from("<HHH", raw, i + 2)
            payload = raw[i + 8 : i + 8 + psz]
            out.append(f"<{g}:{t}>")
            tags.append({"group": g, "type": t, "data": payload.hex()})
            i += 8 + psz
        elif cp == 0x000F and i + 6 <= n:
            payload = raw[i + 2 : i + 6]
            out.append("</>")
            tags.append({"kind": "close", "data": payload.hex()})
            i += 6
        else:
            out.append(raw[i : i + 2].decode("utf-16-le", "replace"))
            i += 2
    return "".join(out), tags


def read_msbt(data: bytes) -> dict[str, dict]:
    if data[:8] != b"MsgStdBn":
        raise ValueError("not MSBT")
    bom = struct.unpack_from("<H", data, 8)[0]
    if bom != 0xFEFF:
        raise ValueError("big-endian MSBT not supported")
    encoding = data[0x0C]
    block_count = struct.unpack_from("<H", data, 0x0E)[0]

    labels: dict[int, str] = {}
    texts: dict[int, str] = {}
    tags: dict[int, list[dict]] = {}
    attr_records: list[bytes] = []
    attr_record_size = 0
    attr_pool_hex = ""
    ato_offsets: list[int] = []

    off = 0x20
    for _ in range(block_count):
        if off + 0x10 > len(data):
            break
        magic = data[off : off + 4]
        block_size = struct.unpack_from("<I", data, off + 4)[0]
        body = data[off + 0x10 : off + 0x10 + block_size]

        if magic == b"LBL1":
            bucket_count = struct.unpack_from("<I", body, 0)[0]
            b_off = 4
            for _ in range(bucket_count):
                lbl_count, lbl_start = struct.unpack_from("<II", body, b_off)
                b_off += 8
                lo = lbl_start
                for _ in range(lbl_count):
                    length = body[lo]
                    lo += 1
                    name = body[lo : lo + length].decode("ascii", "replace")
                    lo += length
                    idx = struct.unpack_from("<I", body, lo)[0]
                    lo += 4
                    labels[idx] = name
        elif magic == b"TXT2":
            count = struct.unpack_from("<I", body, 0)[0]
            offsets = [struct.unpack_from("<I", body, 4 + i * 4)[0] for i in range(count)]
            for i, start in enumerate(offsets):
                end = offsets[i + 1] if i + 1 < count else len(body)
                raw = body[start:end]
                if encoding == 1:
                    text_i, tags_i = _msbt_decode_utf16(raw)
                else:
                    text_i = raw.rstrip(b"\x00").decode("utf-8", "replace")
                    tags_i = []
                texts[i] = text_i
                tags[i] = tags_i
        elif magic == b"ATR1":
            count = struct.unpack_from("<I", body, 0)[0]
            attr_record_size = struct.unpack_from("<I", body, 4)[0]
            records_end = 8 + count * attr_record_size
            for i in range(count):
                attr_records.append(
                    body[8 + i * attr_record_size : 8 + (i + 1) * attr_record_size]
                )
            attr_pool_hex = body[records_end:].hex()
        elif magic == b"ATO1":
            n = len(body) // 4
            ato_offsets = list(struct.unpack_from(f"<{n}I", body))

        off += 0x10 + block_size
        off = (off + 0xF) & ~0xF

    def _slice_record(record: bytes) -> dict[str, str]:
        out: dict[str, str] = {}
        if not ato_offsets or not record:
            return out
        present = sorted(
            ((i, o) for i, o in enumerate(ato_offsets)
             if o != 0xFFFFFFFF and o < attr_record_size),
            key=lambda x: x[1],
        )
        for k, (ati_idx, offset_) in enumerate(present):
            next_off = present[k + 1][1] if k + 1 < len(present) else attr_record_size
            out[str(ati_idx)] = record[offset_:next_off].hex()
        return out

    pool_start = 8 + len(attr_records) * attr_record_size

    out_msgs: dict[str, dict] = {
        META_KEY: {"pool": attr_pool_hex, "pool_start": pool_start},
    }
    for i, label in labels.items():
        if i not in texts:
            continue
        entry_attrs = _slice_record(attr_records[i]) if i < len(attr_records) else {}
        out_msgs[label] = {
            "text": texts[i],
            "tags": tags.get(i, []),
            "attrs": entry_attrs,
        }
    return out_msgs


def ensure_nstool() -> None:
    if NSTOOL.is_file() and os.access(NSTOOL, os.X_OK):
        return
    log("0/7", f"nstool missing at {NSTOOL.relative_to(ROOT)}, building from source")
    if not NSTOOL_SRC.exists():
        subprocess.check_call(
            ["git", "clone", "--recursive", NSTOOL_REPO, str(NSTOOL_SRC)],
        )
    subprocess.check_call(
        ["git", "-C", str(NSTOOL_SRC), "submodule", "update", "--init", "--recursive"],
    )
    subprocess.check_call(["make", "deps"], cwd=str(NSTOOL_SRC))
    subprocess.check_call(["make", "-j"], cwd=str(NSTOOL_SRC))
    built = NSTOOL_SRC / "bin/nstool"
    if not built.is_file():
        die(f"nstool build finished but {built} not produced")
    shutil.copy2(built, NSTOOL)
    NSTOOL.chmod(0o755)


def ensure_oead() -> None:
    try:
        import oead
        return
    except ImportError:
        pass
    log("0/7", "building oead")
    env = {**os.environ, "CMAKE_POLICY_VERSION_MINIMUM": "3.5"}
    spec = f"oead @ git+{OEAD_REPO}@{OEAD_REF}"
    subprocess.check_call(
        ["uv", "pip", "install", "--python", sys.executable, spec],
        env=env,
    )


def stage0_preflight() -> None:
    log("0/7", "preflight")
    for p in (NSP_BASE, NSP_UPDATE):
        if not p.is_file():
            die(f"missing input NSP: {p}")
    if not KEYS.is_file():
        die(
            f"missing prod keys: {KEYS}\n"
            f"        copy them in:  cp ../../keys/prod.keys {KEYS}"
        )
    ensure_nstool()


def stage1_unpack() -> None:
    log("1/7", "nstool unpack (base + update merge)")
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    with tempfile.TemporaryDirectory(prefix="nsp_boot_") as tmp:
        tmp = Path(tmp)
        base_pfs = tmp / "base"
        upd_pfs = tmp / "update"
        base_pfs.mkdir()
        upd_pfs.mkdir()

        nstool(["-x", "/", str(base_pfs), str(NSP_BASE)])
        nstool(["-x", "/", str(upd_pfs), str(NSP_UPDATE)])

        def _resolve(pfs: Path) -> tuple[str, str | None]:
            cnmt_ncas = list(pfs.glob("*.cnmt.nca"))
            if not cnmt_ncas:
                die(f"no .cnmt.nca inside {pfs}")
            cnmt_dir = pfs.parent / f"{pfs.name}_cnmt"
            cnmt_dir.mkdir()
            nstool(["--part0", str(cnmt_dir), str(cnmt_ncas[0])])
            cnmt_files = list(cnmt_dir.glob("*.cnmt"))
            if not cnmt_files:
                die(f"no .cnmt payload inside {cnmt_ncas[0]}")
            contents = parse_cnmt(cnmt_files[0])
            tiks = sorted(pfs.glob("*.tik"))
            tik = str(tiks[0]) if tiks else None
            return contents["Program"], tik

        base_program, _ = _resolve(base_pfs)
        update_program, update_tik = _resolve(upd_pfs)
        if update_tik is None:
            die(f"update NSP {NSP_UPDATE.name} carries no ticket, cannot decrypt")

        nstool([
            "--part1", str(OUT),
            "--basenca", str(base_pfs / f"{base_program}.nca"),
            "--tik", update_tik,
            str(upd_pfs / f"{update_program}.nca"),
        ])


def stage2_walk() -> None:
    log("2/7", f"selective walk - keep {WANTED_DIRS}")
    for entry in OUT.iterdir():
        if entry.name not in WANTED_DIRS:
            if entry.is_dir():
                shutil.rmtree(entry)
            else:
                entry.unlink()


def stage3_zstd() -> None:
    import zstandard as zstd
    dctx = zstd.ZstdDecompressor()
    files = [p for p in OUT.rglob("*.zs") if p.is_file()]
    log("3/7", f"zstd decompress: {len(files)} file(s)")
    for src in files:
        dst = src.with_suffix("")
        if dst.exists():
            dst.unlink()
        with src.open("rb") as fin, dst.open("wb") as fout:
            dctx.copy_stream(fin, fout)
        src.unlink()


def stage4_sarc() -> None:
    archives = sorted((OUT / "Mals").glob("*.sarc"))
    log("4/7", f"SARC unpack (Mals) + MSBP collect: {len(archives)} archive(s)")
    msbp_count = 0
    for arc in archives:
        data = arc.read_bytes()
        out_dir = arc.with_name(arc.name + ".d")
        if out_dir.exists():
            shutil.rmtree(out_dir)
        for e in read_sarc(data):
            target = out_dir / e.name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data[e.offset : e.offset + e.size])
        arc.unlink()
        for msbp in out_dir.rglob("*.msbp"):
            try:
                _MSBP_REGISTRY.merge(parse_msbp(msbp.read_bytes()))
                msbp_count += 1
            except Exception as e:
                log("4/7", f"  MSBP {msbp.relative_to(OUT)}: {e}")
        for child in out_dir.iterdir():
            if child.name not in MALS_KEEP:
                if child.is_dir():
                    shutil.rmtree(child)
                else:
                    child.unlink()
    log("4/7", f"MSBPs parsed: {msbp_count} → {len(_MSBP_REGISTRY.group_names)} groups")


def stage5_byml() -> None:
    import oead
    targets = ("RSDB", "WalkingGrid", "GameData")
    files: list[Path] = []
    for sub in targets:
        d = OUT / sub
        if d.is_dir():
            files.extend(p for p in d.rglob("*") if p.suffix in (".byml", ".bgyml"))
    log("5/7", f"BYML → YAML: {len(files)} file(s)")
    skipped = 0
    for src in files:
        try:
            doc = oead.byml.from_binary(src.read_bytes())
            text = oead.byml.to_text(doc)
        except Exception as e:
            msg = str(e)
            if "unexpected type" in msg or "Invalid value node" in msg:
                skipped += 1
                src.unlink()
                continue
            raise
        dst = src.with_suffix(src.suffix + ".yml")
        if dst.exists():
            dst.unlink()
        dst.write_text(text, encoding="utf-8")
        src.unlink()
    if skipped:
        log("5/7", f"  skipped {skipped} BYML v7 file(s)")


def stage6_msbt() -> None:
    files = [p for p in (OUT / "Mals").rglob("*.msbt") if p.is_file()]
    have_reg = bool(_MSBP_REGISTRY.group_names)
    log("6/7", f"MSBT → JSON{' + MSBP resolve' if have_reg else ''}: {len(files)} file(s)")
    for src in files:
        messages = read_msbt(src.read_bytes())
        if have_reg:
            resolve_msbt_tags(messages, _MSBP_REGISTRY)
        dst = src.with_suffix(src.suffix + ".json")
        if dst.exists():
            dst.unlink()
        dst.write_text(
            json.dumps(messages, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        src.unlink()


def stage7_bntx() -> None:
    from PIL import Image
    import texture2ddecoder
    files = [p for p in (OUT / "Icon").rglob("*.bntx") if p.is_file()]
    log("7/7", f"BNTX → PNG: {len(files)} file(s)")
    failed = 0
    for src in files:
        try:
            bntx_to_png(src)
        except UnsupportedBNTX as e:
            failed += 1
            log("7/7", f"  skip {src.name}: {e}")
            try:
                src.unlink()
            except FileNotFoundError:
                pass
    if failed:
        log("7/7", f"  {failed} BNTX file(s) skipped (unsupported format)")


_ASTC_BLOCK = {
    0x2D: (4, 4),  0x2E: (5, 4),  0x2F: (5, 5),
    0x30: (6, 5),  0x31: (6, 6),  0x32: (8, 5),
    0x33: (8, 6),  0x34: (8, 8),  0x35: (10, 5),
    0x36: (10, 6), 0x37: (10, 8), 0x38: (10, 10),
    0x39: (12, 10), 0x3A: (12, 12),
}
_BCN_FORMATS = {0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20}
_BPP_OR_BPB = {
    0x02: 1, 0x07: 2, 0x09: 2, 0x0B: 4, 0x15: 8,
    0x1A: 8, 0x1B: 16, 0x1C: 16, 0x1D: 8, 0x1E: 16, 0x1F: 16, 0x20: 16,
    0x2D: 16, 0x2E: 16, 0x2F: 16, 0x30: 16, 0x31: 16, 0x32: 16,
    0x33: 16, 0x34: 16, 0x35: 16, 0x36: 16, 0x37: 16, 0x38: 16,
    0x39: 16, 0x3A: 16,
}


def _block_dims(fmt: int) -> tuple[int, int]:
    hi = fmt >> 8
    if hi in _ASTC_BLOCK:
        return _ASTC_BLOCK[hi]
    if hi in _BCN_FORMATS:
        return (4, 4)
    return (1, 1)


@dataclass
class _BntxTexture:
    name: str
    width: int
    height: int
    format: int
    num_mips: int
    num_faces: int
    size_range: int
    tile_mode: int
    alignment: int
    comp_sel: int
    data: bytes


def _parse_bntx(blob: bytes) -> list[_BntxTexture]:
    if blob[0x0C:0x0E] != b"\xff\xfe":
        raise ValueError("big-endian or bad BOM")
    if blob[0:4] != b"BNTX":
        raise ValueError("not BNTX")
    if blob[0x20:0x24] != b"NX  ":
        raise ValueError("missing NX block")
    tex_count = struct.unpack_from("<I", blob, 0x24)[0]
    info_ptr_addr = struct.unpack_from("<Q", blob, 0x28)[0]
    textures: list[_BntxTexture] = []
    for i in range(tex_count):
        brti_ptr = struct.unpack_from("<Q", blob, info_ptr_addr + i * 8)[0]
        tile_mode = blob[brti_ptr + 0x10]
        num_mips = struct.unpack_from("<H", blob, brti_ptr + 0x16)[0]
        fmt = struct.unpack_from("<I", blob, brti_ptr + 0x1C)[0]
        width, height = struct.unpack_from("<ii", blob, brti_ptr + 0x24)
        num_faces = struct.unpack_from("<i", blob, brti_ptr + 0x30)[0]
        size_range = struct.unpack_from("<i", blob, brti_ptr + 0x34)[0]
        image_size = struct.unpack_from("<i", blob, brti_ptr + 0x50)[0]
        alignment = struct.unpack_from("<i", blob, brti_ptr + 0x54)[0]
        comp_sel = struct.unpack_from("<i", blob, brti_ptr + 0x58)[0]
        name_addr = struct.unpack_from("<q", blob, brti_ptr + 0x60)[0]
        ptrs_addr = struct.unpack_from("<q", blob, brti_ptr + 0x70)[0]
        name_len = struct.unpack_from("<H", blob, name_addr)[0]
        name = blob[name_addr + 2 : name_addr + 2 + name_len].decode("utf-8", "replace")
        data_addr = struct.unpack_from("<q", blob, ptrs_addr)[0]
        textures.append(_BntxTexture(
            name=name, width=width, height=height, format=fmt,
            num_mips=num_mips, num_faces=num_faces,
            size_range=size_range, tile_mode=tile_mode,
            alignment=alignment, comp_sel=comp_sel,
            data=bytes(blob[data_addr : data_addr + image_size]),
        ))
    return textures


def _div_round_up(n: int, d: int) -> int:
    return (n + d - 1) // d


def _round_up(x: int, y: int) -> int:
    return ((x - 1) | (y - 1)) + 1


def _addr_block_linear(x: int, y: int, w_in_bytes: int, bpp: int, bh: int) -> int:
    gobs_w = _div_round_up(w_in_bytes, 64)
    gob = (
        (y // (8 * bh)) * 512 * bh * gobs_w
        + (x * bpp // 64) * 512 * bh
        + ((y % (8 * bh)) // 8) * 512
    )
    xb = x * bpp
    return (
        gob
        + ((xb % 64) // 32) * 256
        + ((y % 8) // 2) * 64
        + ((xb % 32) // 16) * 32
        + (y % 2) * 16
        + (xb % 16)
    )


def _deswizzle(width, height, blk_w, blk_h, bpp, tile_mode, alignment, size_range, data):
    bh = 1 << size_range
    w_blocks = _div_round_up(width, blk_w)
    h_blocks = _div_round_up(height, blk_h)
    if tile_mode == 0:
        pitch = _round_up(w_blocks * bpp, 32)
        _surf = _round_up(pitch * h_blocks, alignment)
    else:
        pitch = _round_up(w_blocks * bpp, 64)
        _surf = _round_up(pitch * _round_up(h_blocks, bh * 8), alignment)
    out = bytearray(w_blocks * h_blocks * bpp)
    data_len = len(data)
    if tile_mode == 0:
        for y in range(h_blocks):
            for x in range(w_blocks):
                src = y * pitch + x * bpp
                if src + bpp <= data_len:
                    out[(y * w_blocks + x) * bpp : (y * w_blocks + x) * bpp + bpp] = \
                        data[src : src + bpp]
    else:
        w_bytes = w_blocks * bpp
        for y in range(h_blocks):
            for x in range(w_blocks):
                src = _addr_block_linear(x, y, w_bytes, bpp, bh)
                if src + bpp <= data_len:
                    out[(y * w_blocks + x) * bpp : (y * w_blocks + x) * bpp + bpp] = \
                        data[src : src + bpp]
    return bytes(out)


def _decode_to_image(tex, linear):
    import texture2ddecoder
    from PIL import Image
    w, h, fmt = tex.width, tex.height, tex.format
    hi = fmt >> 8
    bc_decoders = {
        0x1A: texture2ddecoder.decode_bc1,
        0x1C: texture2ddecoder.decode_bc3,
        0x1D: texture2ddecoder.decode_bc4,
        0x1E: texture2ddecoder.decode_bc5,
        0x1F: texture2ddecoder.decode_bc6,
        0x20: texture2ddecoder.decode_bc7,
    }
    if hi in bc_decoders:
        bgra = bc_decoders[hi](linear, w, h)
        return Image.frombytes("RGBA", (w, h), bgra, "raw", "BGRA")
    if hi in _ASTC_BLOCK:
        bw, bh = _ASTC_BLOCK[hi]
        bgra = texture2ddecoder.decode_astc(linear, w, h, bw, bh)
        return Image.frombytes("RGBA", (w, h), bgra, "raw", "BGRA")
    if fmt in (0x0B01, 0x0B06):
        return Image.frombytes("RGBA", (w, h), linear[: w * h * 4])
    if fmt in (0x0C01, 0x0C06):
        return Image.frombytes("RGBA", (w, h), linear[: w * h * 4], "raw", "BGRA")
    if fmt == 0x0201:
        return Image.frombytes("L", (w, h), linear[: w * h]).convert("RGBA")
    if fmt == 0x0901:
        la = Image.frombytes("LA", (w, h), linear[: w * h * 2])
        rgba = Image.new("RGBA", (w, h))
        r, a = la.split()
        rgba.putalpha(255)
        rgba.paste(Image.merge("RGBA", (r, a, Image.new("L", (w, h)), rgba.split()[3])))
        return rgba
    return None


class UnsupportedBNTX(RuntimeError):
    pass


def bntx_to_png(src: Path) -> list[Path]:
    blob = src.read_bytes()
    textures = _parse_bntx(blob)
    if not textures:
        return []
    if len(textures) == 1:
        outputs = [src.with_suffix(".png")]
    else:
        out_dir = src.with_name(src.name + ".d")
        out_dir.mkdir(parents=True, exist_ok=True)
        outputs = [out_dir / f"{t.name}.png" for t in textures]
    emitted: list[Path] = []
    for tex, out in zip(textures, outputs):
        if tex.num_faces > 1:
            continue
        blk_w, blk_h = _block_dims(tex.format)
        bpp = _BPP_OR_BPB.get(tex.format >> 8)
        if bpp is None:
            raise UnsupportedBNTX(f"unknown format 0x{tex.format:04x}")
        linear = _deswizzle(
            tex.width, tex.height, blk_w, blk_h,
            bpp, tex.tile_mode, tex.alignment, tex.size_range, tex.data,
        )
        expected = _div_round_up(tex.width, blk_w) * _div_round_up(tex.height, blk_h) * bpp
        linear = linear[:expected]
        img = _decode_to_image(tex, linear)
        if img is None:
            raise UnsupportedBNTX(f"no decoder for format 0x{tex.format:04x}")
        img.save(out, "PNG", optimize=False, compress_level=3)
        emitted.append(out)
    if emitted:
        src.unlink()
    return emitted


def main() -> int:
    stage0_preflight()
    ensure_oead()
    stage1_unpack()
    stage2_walk()
    stage3_zstd()
    stage4_sarc()
    stage5_byml()
    stage6_msbt()
    stage7_bntx()
    log("done", f"{OUT.relative_to(ROOT)} ready")
    return 0


if __name__ == "__main__":
    sys.exit(main())
