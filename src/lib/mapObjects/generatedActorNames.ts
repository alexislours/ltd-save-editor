export type ActorInfo = { key: string; category: string };

export type ActorFootprint = {
  x0: number;
  y0: number;
  w: number;
  h: number;
  goalX: number | null;
  goalY: number | null;
};

export const ACTOR_NAMES: ReadonlyMap<number, ActorInfo> = new Map([
  [0x00783c5e, { key: 'ObjFenceIron_07', category: 'MapObject_Obje_Island' }],
  [0x00f79623, { key: 'ObjTreeBroadleaf', category: 'MapObject_Obje_Island' }],
  [0x020defc1, { key: 'ObjGuardrail_04', category: 'MapObject_Obje_Island' }],
  [0x02783fd0, { key: 'ObjVendingMachine', category: 'MapObject_Obje_Island' }],
  [0x02a4af54, { key: 'ObjArchAir_01', category: 'MapObject_Obje_Island' }],
  [0x02b59bf9, { key: 'ObjStreetLamp_05', category: 'MapObject_Obje_Island' }],
  [0x0335b0a7, { key: 'ObjBell_05', category: 'MapObject_Obje_Island' }],
  [0x03554f30, { key: 'ObjBonfire_06', category: 'MapObject_Obje_Island' }],
  [0x04c959f5, { key: 'ObjThrone_05', category: 'MapObject_Obje_Island' }],
  [0x0576353d, { key: 'ObjStepStone_02', category: 'MapObject_IslandStep' }],
  [0x06019f97, { key: 'ObjBeachParasol_01', category: 'MapObject_Obje_Island' }],
  [0x074ffde1, { key: 'ObjFenceLattice_01', category: 'MapObject_Obje_Island' }],
  [0x075960d2, { key: 'ObjDrinkingFountain_05', category: 'MapObject_Obje_Island' }],
  [0x099363e3, { key: 'ObjBonfire_01', category: 'MapObject_Obje_Island' }],
  [0x0a29f456, { key: 'ObjSignboardTutorial_04', category: 'MapObject_Obje_Island' }],
  [0x0a9f39df, { key: 'ObjTrashCan_02', category: 'MapObject_Obje_Island' }],
  [0x0ace805a, { key: 'ObjGrandlight_04', category: 'MapObject_Obje_Island' }],
  [0x0b113fde, { key: 'ObjGuardrail_01', category: 'MapObject_Obje_Island' }],
  [0x0bc3ad96, { key: 'ObjSprinkler_03', category: 'MapObject_Obje_Island' }],
  [0x0da9f2cc, { key: 'ObjTreeGinkgo', category: 'MapObject_Obje_Island' }],
  [0x0daa36aa, { key: 'ObjSignboardTutorial_03', category: 'MapObject_Obje_Island' }],
  [0x0e62f2f4, { key: 'ObjFenceIron_05', category: 'MapObject_Obje_Island' }],
  [0x0ed12c63, { key: 'ObjHedge_05', category: 'MapObject_Obje_Island' }],
  [0x0f012cb7, { key: 'ObjTreeBroadleaf_01', category: 'MapObject_Obje_Island' }],
  [0x0fc4dae6, { key: 'ObjHedge_01', category: 'MapObject_Obje_Island' }],
  [0x1078d5b8, { key: 'ObjFenceLattice_04', category: 'MapObject_Obje_Island' }],
  [0x10a05086, { key: 'ObjFenceChain_07', category: 'MapObject_Obje_Island' }],
  [0x1116f5d8, { key: 'ObjFireworksAerial_01', category: 'MapObject_Obje_Island' }],
  [0x118d621c, { key: 'ObjThrone_01', category: 'MapObject_Obje_Island' }],
  [0x11964275, { key: 'ObjFenceStake_07', category: 'MapObject_Obje_Island' }],
  [0x1384d84b, { key: 'ObjLanternSakura_02', category: 'MapObject_Obje_Island' }],
  [0x143f32d9, { key: 'ObjJackOLantern_02', category: 'MapObject_Obje_Island' }],
  [0x16503a9e, { key: 'ObjLanternSakura_03', category: 'MapObject_Obje_Island' }],
  [0x1680e2f4, { key: 'ObjHedge_03', category: 'MapObject_Obje_Island' }],
  [0x16905ce1, { key: 'ObjStepWood', category: 'MapObject_IslandStep' }],
  [0x16a115fc, { key: 'ObjFencePipe_06', category: 'MapObject_Obje_Island' }],
  [0x17133c16, { key: 'ObjGuardrail_02', category: 'MapObject_Obje_Island' }],
  [0x179104ed, { key: 'ObjTrafficLight_04', category: 'MapObject_Obje_Island' }],
  [0x1835fdab, { key: 'ObjTableBench_05', category: 'MapObject_Obje_Island' }],
  [0x18bc0888, { key: 'ObjFenceGuardpipe_07', category: 'MapObject_Obje_Island' }],
  [0x18c416de, { key: 'ObjStreetLamp_04', category: 'MapObject_Obje_Island' }],
  [0x19a39056, { key: 'ObjBonfire_05', category: 'MapObject_Obje_Island' }],
  [0x1a1f3c2e, { key: 'ObjSnowman', category: 'MapObject_Obje_Island' }],
  [0x1ad1b47d, { key: 'ObjBenchTerrace_05', category: 'MapObject_Obje_Island' }],
  [0x1b2ff9ef, { key: 'ObjJackOLantern_03', category: 'MapObject_Obje_Island' }],
  [0x1b96fc41, { key: 'ObjStreetLamp', category: 'MapObject_Obje_Island' }],
  [0x1c2eceb3, { key: 'ObjShowerOutdoor_06', category: 'MapObject_Obje_Island' }],
  [0x1cc3f3b5, { key: 'ObjFenceGuardpipe_04', category: 'MapObject_Obje_Island' }],
  [0x1d43382b, { key: 'ObjRoadSign', category: 'MapObject_Obje_Island' }],
  [0x1d880003, { key: 'ObjThrone_03', category: 'MapObject_Obje_Island' }],
  [0x1db7b2ec, { key: 'ObjTableBench_03', category: 'MapObject_Obje_Island' }],
  [0x1dd946b9, { key: 'ObjLighthouse_02', category: 'MapObject_Obje_Island' }],
  [0x1e702ae2, { key: 'ObjDrinkingFountain_02', category: 'MapObject_Obje_Island' }],
  [0x1eb0ff5c, { key: 'ObjJackOLantern', category: 'MapObject_Obje_Island' }],
  [0x1f1eb32d, { key: 'FacilityFamilyRestaurant', category: 'MapObject_Facility_Location' }],
  [0x20e67c30, { key: 'ObjFenceBarbed_02', category: 'MapObject_Obje_Island' }],
  [0x225d91bf, { key: 'ObjStepIron_03', category: 'MapObject_IslandStep' }],
  [0x22f85aa9, { key: 'FacilityItemShop', category: 'MapObject_Facility_Shop' }],
  [0x241cba0a, { key: 'ObjBeachBed_04', category: 'MapObject_Obje_Island' }],
  [0x256ae934, { key: 'ObjTreeConiferous_01', category: 'MapObject_Obje_Island' }],
  [0x2664f7d1, { key: 'ObjTreePalm', category: 'MapObject_Obje_Island' }],
  [0x26b0b518, { key: 'ObjVendingMachine_04', category: 'MapObject_Obje_Island' }],
  [0x2720d857, { key: 'ObjFlowerTulip_02', category: 'MapObject_Obje_Island' }],
  [0x27d7affa, { key: 'ObjJackOLantern_05', category: 'MapObject_Obje_Island' }],
  [0x28895d61, { key: 'ObjFlowerPampasGrass', category: 'MapObject_Obje_Island' }],
  [0x28898600, { key: 'ObjFenceBarbed_06', category: 'MapObject_Obje_Island' }],
  [0x28c866e4, { key: 'ObjArchAir_04', category: 'MapObject_Obje_Island' }],
  [0x28f121a9, { key: 'ObjLighthouse_05', category: 'MapObject_Obje_Island' }],
  [0x2c84a80a, { key: 'ObjStepStone_01', category: 'MapObject_IslandStep' }],
  [0x2cd639c2, { key: 'ObjBenchTerrace_01', category: 'MapObject_Obje_Island' }],
  [0x2d70949a, { key: 'ObjBenchHome', category: 'MapObject_Obje_Island' }],
  [0x2e02fe97, { key: 'ObjBell_01', category: 'MapObject_Obje_Island' }],
  [0x30ebfc39, { key: 'ObjSafetyCone', category: 'MapObject_Obje_Island' }],
  [0x31e8d694, { key: 'ObjTreeElectric_06', category: 'MapObject_Obje_Island' }],
  [0x35042895, { key: 'ObjTreeChristmas', category: 'MapObject_Obje_Island' }],
  [0x3527b759, { key: 'ObjGuardrail_03', category: 'MapObject_Obje_Island' }],
  [0x35bc3a6c, { key: 'ObjBonfire_03', category: 'MapObject_Obje_Island' }],
  [0x35ef1762, { key: 'ObjTreeElectric_05', category: 'MapObject_Obje_Island' }],
  [0x36147dc4, { key: 'ObjBeachBed', category: 'MapObject_Obje_Island' }],
  [0x3634f451, { key: 'ObjGrandlight_02', category: 'MapObject_Obje_Island' }],
  [0x37457636, { key: 'ObjSnowman_01', category: 'MapObject_Obje_Island' }],
  [0x38c47000, { key: 'ObjFenceGuardpipe_06', category: 'MapObject_Obje_Island' }],
  [0x39a31074, { key: 'ObjFlowerpot_01', category: 'MapObject_Obje_Island' }],
  [0x39bb7d36, { key: 'ObjFenceGuardpipe', category: 'MapObject_Obje_Island' }],
  [0x3a19045b, { key: 'ObjHedge_02', category: 'MapObject_Obje_Island' }],
  [0x3a379430, { key: 'ObjBenchPark', category: 'MapObject_Obje_Island' }],
  [0x3b21e48e, { key: 'ObjBenchTerrace_07', category: 'MapObject_Obje_Island' }],
  [0x3c01c777, { key: 'ObjStreetLampRetro_02', category: 'MapObject_Obje_Island' }],
  [0x3c040ef5, { key: 'ObjStandingTorch', category: 'MapObject_Obje_Island' }],
  [0x3c266f7e, { key: 'ObjClockTower_07', category: 'MapObject_Obje_Island' }],
  [0x3c97c599, { key: 'ObjSwingRider_05', category: 'MapObject_Obje_Island' }],
  [0x3cac27b7, { key: 'ObjFlowerpot_03', category: 'MapObject_Obje_Island' }],
  [0x3cdfa786, { key: 'ObjSwingRider_07', category: 'MapObject_Obje_Island' }],
  [0x3de4618a, { key: 'ObjStepIron_04', category: 'MapObject_IslandStep' }],
  [0x3de81df5, { key: 'ObjBeachParasol_07', category: 'MapObject_Obje_Island' }],
  [0x3dfc546b, { key: 'ObjPinwheel_07', category: 'MapObject_Obje_Island' }],
  [0x3e2ae3d8, { key: 'ObjTableBench_04', category: 'MapObject_Obje_Island' }],
  [0x3e7dc6f9, { key: 'ObjBell_04', category: 'MapObject_Obje_Island' }],
  [0x3f360d90, { key: 'ObjGuardrail_05', category: 'MapObject_Obje_Island' }],
  [0x3f612d44, { key: 'ObjArchAir_07', category: 'MapObject_Obje_Island' }],
  [0x408ec56c, { key: 'ObjSeesaw_04', category: 'MapObject_Obje_Island' }],
  [0x41436cba, { key: 'ObjFireworksErupting', category: 'MapObject_Obje_Island' }],
  [0x41953204, { key: 'ObjFencePipe_01', category: 'MapObject_Obje_Island' }],
  [0x4209ab17, { key: 'ObjAerogenerator_05', category: 'MapObject_Obje_Island' }],
  [0x434533c8, { key: 'ObjLanternSakura_01', category: 'MapObject_Obje_Island' }],
  [0x43f76680, { key: 'ObjFenceGuardpipe_03', category: 'MapObject_Obje_Island' }],
  [0x4499cc8c, { key: 'FacilityPhotoStudio', category: 'MapObject_Facility_Contents' }],
  [0x45720afc, { key: 'ObjFenceStake_01', category: 'MapObject_Obje_Island' }],
  [0x4691b9df, { key: 'ObjFenceWood_03', category: 'MapObject_Obje_Island' }],
  [0x48870a72, { key: 'ObjSeesaw_02', category: 'MapObject_Obje_Island' }],
  [0x48e1e211, { key: 'ObjHedge', category: 'MapObject_Obje_Island' }],
  [0x49893c7b, { key: 'ObjArchAir_03', category: 'MapObject_Obje_Island' }],
  [0x4999d24f, { key: 'ObjBell_07', category: 'MapObject_Obje_Island' }],
  [0x4ad50099, { key: 'ObjFlowerpot_05', category: 'MapObject_Obje_Island' }],
  [0x4cdf13e3, { key: 'ObjTreeCactus', category: 'MapObject_Obje_Island' }],
  [0x4d590b0f, { key: 'ObjGuardrail_06', category: 'MapObject_Obje_Island' }],
  [0x4e992963, { key: 'FacilityTower', category: 'MapObject_Facility_Contents' }],
  [0x4ebe5dff, { key: 'ObjBonfire_02', category: 'MapObject_Obje_Island' }],
  [0x4f214c75, { key: 'ObjFenceChain_05', category: 'MapObject_Obje_Island' }],
  [0x4f2a4a2c, { key: 'FacilityMarket', category: 'MapObject_Facility_Shop' }],
  [0x4f31ecab, { key: 'ObjFlowerNarcissus_01', category: 'MapObject_Obje_Island' }],
  [0x51456fc7, { key: 'ObjBenchTerrace_02', category: 'MapObject_Obje_Island' }],
  [0x51f9ebe6, { key: 'ObjFencePipe_03', category: 'MapObject_Obje_Island' }],
  [0x52249c2d, { key: 'ObjSprinkler_04', category: 'MapObject_Obje_Island' }],
  [0x536c8eeb, { key: 'ObjStreetLampRetro_01', category: 'MapObject_Obje_Island' }],
  [0x53a5e5b4, { key: 'ObjBeachBed_01', category: 'MapObject_Obje_Island' }],
  [0x53cdc538, { key: 'ObjTableBench_07', category: 'MapObject_Obje_Island' }],
  [0x5462e40d, { key: 'ObjVendingMachine_01', category: 'MapObject_Obje_Island' }],
  [0x5468ea41, { key: 'ObjBenchTerrace', category: 'MapObject_Obje_Island' }],
  [0x54b486c1, { key: 'ObjBenchHome_04', category: 'MapObject_Obje_Island' }],
  [0x555e4971, { key: 'ObjStreetLamp_07', category: 'MapObject_Obje_Island' }],
  [0x5bc17e5a, { key: 'ObjHedge_06', category: 'MapObject_Obje_Island' }],
  [0x5c44bb14, { key: 'ObjTrashCan_05', category: 'MapObject_Obje_Island' }],
  [0x5c80d8f9, { key: 'ObjJackOLantern_04', category: 'MapObject_Obje_Island' }],
  [0x5e545d46, { key: 'ObjLighthouse_06', category: 'MapObject_Obje_Island' }],
  [0x5e8fc05f, { key: 'ObjTrashCan', category: 'MapObject_Obje_Island' }],
  [0x5ea082c6, { key: 'ObjHedge_04', category: 'MapObject_Obje_Island' }],
  [0x5fd51925, { key: 'ObjTreeBroadleaf_02', category: 'MapObject_Obje_Island' }],
  [0x60974f1d, { key: 'ObjBenchPark_03', category: 'MapObject_Obje_Island' }],
  [0x613e1748, { key: 'ObjFlowerTulip_01', category: 'MapObject_Obje_Island' }],
  [0x623f9384, { key: 'ObjSignboardTutorial', category: 'MapObject_Obje_Island' }],
  [0x631a5edd, { key: 'ObjBeachBed_07', category: 'MapObject_Obje_Island' }],
  [0x637d975d, { key: 'ObjVendingMachine_02', category: 'MapObject_Obje_Island' }],
  [0x639739e4, { key: 'FacilitySupermarket', category: 'MapObject_Facility_Shop' }],
  [0x6400ef93, { key: 'FacilityInteriorShop', category: 'MapObject_Facility_Shop' }],
  [0x640bee9a, { key: 'ObjStepIron_02', category: 'MapObject_IslandStep' }],
  [0x644e5834, { key: 'ObjTrafficLight', category: 'MapObject_Obje_Island' }],
  [0x6450a5b6, { key: 'ObjStreetLamp_06', category: 'MapObject_Obje_Island' }],
  [0x655d2cf0, { key: 'ObjStreetLamp_03', category: 'MapObject_Obje_Island' }],
  [0x66f4bae5, { key: 'ObjFenceChain_03', category: 'MapObject_Obje_Island' }],
  [0x67b54869, { key: 'ObjStreetLampRetro_04', category: 'MapObject_Obje_Island' }],
  [0x67ddf3cc, { key: 'ObjFireworksErupting_01', category: 'MapObject_Obje_Island' }],
  [0x68b0500a, { key: 'ObjPinwheel_05', category: 'MapObject_Obje_Island' }],
  [0x69c96e86, { key: 'ObjSprinkler_02', category: 'MapObject_Obje_Island' }],
  [0x69f07ec5, { key: 'ObjRock', category: 'MapObject_Obje_Island' }],
  [0x6be3ab9c, { key: 'ObjFenceChain_06', category: 'MapObject_Obje_Island' }],
  [0x6d001ab7, { key: 'ObjTrafficLight_07', category: 'MapObject_Obje_Island' }],
  [0x6dfa5726, { key: 'ObjBenchPark_07', category: 'MapObject_Obje_Island' }],
  [0x6e0f5ddc, { key: 'ObjFenceGuardpipe_02', category: 'MapObject_Obje_Island' }],
  [0x6e5e424c, { key: 'ObjFlowerpot_04', category: 'MapObject_Obje_Island' }],
  [0x6eb4472b, { key: 'ObjDrinkingFountain_04', category: 'MapObject_Obje_Island' }],
  [0x6f96359e, { key: 'ObjLighthouse_07', category: 'MapObject_Obje_Island' }],
  [0x6fe08db1, { key: 'ObjSprinkler_05', category: 'MapObject_Obje_Island' }],
  [0x708aefeb, { key: 'ObjRock_02', category: 'MapObject_Obje_Island' }],
  [0x70ccf14b, { key: 'ObjTreeCherry', category: 'MapObject_Obje_Island' }],
  [0x70f1acbe, { key: 'ObjFenceStake_05', category: 'MapObject_Obje_Island' }],
  [0x7137a07c, { key: 'ObjStreetLampRetro_07', category: 'MapObject_Obje_Island' }],
  [0x720fc83f, { key: 'ObjSwingRider_04', category: 'MapObject_Obje_Island' }],
  [0x7277d140, { key: 'ObjFenceStake_02', category: 'MapObject_Obje_Island' }],
  [0x72cc4f28, { key: 'ObjFenceChain_04', category: 'MapObject_Obje_Island' }],
  [0x72ce0895, { key: 'ObjClockTower_06', category: 'MapObject_Obje_Island' }],
  [0x72eb0d7a, { key: 'ObjFireworksAerial', category: 'MapObject_Obje_Island' }],
  [0x7312af8b, { key: 'ObjFenceIron_04', category: 'MapObject_Obje_Island' }],
  [0x738bd7a2, { key: 'FacilityFerrisWheel', category: 'MapObject_Facility_Location' }],
  [0x739bb804, { key: 'ObjBenchPark_01', category: 'MapObject_Obje_Island' }],
  [0x74118a38, { key: 'ObjBell', category: 'MapObject_Obje_Island' }],
  [0x7591362f, { key: 'ObjFenceIron_03', category: 'MapObject_Obje_Island' }],
  [0x75fe8121, { key: 'ObjStepWood_01', category: 'MapObject_IslandStep' }],
  [0x779b5f66, { key: 'FacilityFountainPark', category: 'MapObject_Facility_Location' }],
  [0x77b633dd, { key: 'ObjWeed', category: 'MapObject_Obje_Island' }],
  [0x77d02094, { key: 'ObjStepIron', category: 'MapObject_IslandStep' }],
  [0x793bf08f, { key: 'ObjFenceLattice_05', category: 'MapObject_Obje_Island' }],
  [0x798cc61e, { key: 'ObjBell_03', category: 'MapObject_Obje_Island' }],
  [0x79aad069, { key: 'ObjShowerOutdoor_05', category: 'MapObject_Obje_Island' }],
  [0x7a3313bd, { key: 'ObjLighthouse_04', category: 'MapObject_Obje_Island' }],
  [0x7ab365bb, { key: 'ObjFlowerLavender', category: 'MapObject_Obje_Island' }],
  [0x7b28f8c4, { key: 'ObjSwingRider_03', category: 'MapObject_Obje_Island' }],
  [0x7bd6ecbe, { key: 'ObjSeesaw_05', category: 'MapObject_Obje_Island' }],
  [0x7bf30ad7, { key: 'ObjFenceChain_02', category: 'MapObject_Obje_Island' }],
  [0x7c83a53c, { key: 'ObjFencePipe_04', category: 'MapObject_Obje_Island' }],
  [0x7cb5537a, { key: 'FacilityFountain', category: 'MapObject_Facility_Location' }],
  [0x7cc23163, { key: 'ObjSwingRider_01', category: 'MapObject_Obje_Island' }],
  [0x7cf73c42, { key: 'ObjFenceBarbed_04', category: 'MapObject_Obje_Island' }],
  [0x7f4b7639, { key: 'ObjWeed_01', category: 'MapObject_Obje_Island' }],
  [0x7ff35b85, { key: 'FacilityClothShop', category: 'MapObject_Facility_Shop' }],
  [0x80273dca, { key: 'ObjTreeElectric', category: 'MapObject_Obje_Island' }],
  [0x80c4e173, { key: 'ObjFlowerTulip', category: 'MapObject_Obje_Island' }],
  [0x81d8840d, { key: 'ObjSeesaw_06', category: 'MapObject_Obje_Island' }],
  [0x821c5664, { key: 'ObjSwingRider', category: 'MapObject_Obje_Island' }],
  [0x8260ac6d, { key: 'ObjBenchHome_02', category: 'MapObject_Obje_Island' }],
  [0x8479278d, { key: 'ObjSafetyCone_05', category: 'MapObject_Obje_Island' }],
  [0x852b143a, { key: 'ObjThrone_04', category: 'MapObject_Obje_Island' }],
  [0x8653643d, { key: 'ObjSignboardTutorial_02', category: 'MapObject_Obje_Island' }],
  [0x86adc47d, { key: 'ObjAerogenerator_03', category: 'MapObject_Obje_Island' }],
  [0x86bf727c, { key: 'ObjBeachBed_06', category: 'MapObject_Obje_Island' }],
  [0x86e54ef3, { key: 'ObjStreetLampRetro_05', category: 'MapObject_Obje_Island' }],
  [0x88ad18c8, { key: 'ObjFenceBarbed_03', category: 'MapObject_Obje_Island' }],
  [0x893aa4bd, { key: 'ObjSwingRider_02', category: 'MapObject_Obje_Island' }],
  [0x8959f121, { key: 'ObjFenceWood_01', category: 'MapObject_Obje_Island' }],
  [0x89706ab5, { key: 'ObjGrandlight_01', category: 'MapObject_Obje_Island' }],
  [0x8c677620, { key: 'ObjFencePipe_05', category: 'MapObject_Obje_Island' }],
  [0x8ca1ca2a, { key: 'ObjFenceGuardpipe_05', category: 'MapObject_Obje_Island' }],
  [0x8ceb9861, { key: 'ObjTreeElectric_04', category: 'MapObject_Obje_Island' }],
  [0x8d1d2c86, { key: 'ObjDrinkingFountain', category: 'MapObject_Obje_Island' }],
  [0x8d284263, { key: 'ObjStepIron_06', category: 'MapObject_IslandStep' }],
  [0x8d42df09, { key: 'ObjShowerOutdoor', category: 'MapObject_Obje_Island' }],
  [0x8d7ac9e4, { key: 'ObjTrashCan_01', category: 'MapObject_Obje_Island' }],
  [0x8d8ab2f2, { key: 'ObjTrashCan_03', category: 'MapObject_Obje_Island' }],
  [0x8e5b647c, { key: 'ObjTreeElectric_02', category: 'MapObject_Obje_Island' }],
  [0x8ed43524, { key: 'ObjFenceBarbed_01', category: 'MapObject_Obje_Island' }],
  [0x90bd04f1, { key: 'ObjFenceStake_03', category: 'MapObject_Obje_Island' }],
  [0x9296757d, { key: 'ObjFenceBarbed', category: 'MapObject_Obje_Island' }],
  [0x92f03864, { key: 'ObjThrone_02', category: 'MapObject_Obje_Island' }],
  [0x93acc870, { key: 'ObjArchAir_05', category: 'MapObject_Obje_Island' }],
  [0x93bfa683, { key: 'ObjTableBench_01', category: 'MapObject_Obje_Island' }],
  [0x94046edf, { key: 'ObjTableBench', category: 'MapObject_Obje_Island' }],
  [0x94a2b14c, { key: 'ObjLanternSakura', category: 'MapObject_Obje_Island' }],
  [0x95fa4f31, { key: 'ObjClockTower_03', category: 'MapObject_Obje_Island' }],
  [0x96b750d7, { key: 'ObjFenceWood_02', category: 'MapObject_Obje_Island' }],
  [0x96c0e15a, { key: 'ObjGrandlight_03', category: 'MapObject_Obje_Island' }],
  [0x97303927, { key: 'ObjDrinkingFountain_01', category: 'MapObject_Obje_Island' }],
  [0x9737f2ae, { key: 'ObjTableBench_02', category: 'MapObject_Obje_Island' }],
  [0x9818108c, { key: 'ObjTreeConiferous', category: 'MapObject_Obje_Island' }],
  [0x99c0dea5, { key: 'ObjAerogenerator_04', category: 'MapObject_Obje_Island' }],
  [0x9a993894, { key: 'ObjGrandlight_05', category: 'MapObject_Obje_Island' }],
  [0x9bd11dd8, { key: 'ObjFireworksErupting_02', category: 'MapObject_Obje_Island' }],
  [0x9cb9f35b, { key: 'ObjFlowerCosmos_01', category: 'MapObject_Obje_Island' }],
  [0x9e3fdc71, { key: 'ObjBeachParasol_02', category: 'MapObject_Obje_Island' }],
  [0xa02d2f2e, { key: 'ObjSafetyCone_01', category: 'MapObject_Obje_Island' }],
  [0xa14c1b16, { key: 'ObjArchAir_02', category: 'MapObject_Obje_Island' }],
  [0xa4552121, { key: 'ObjFlowerAnemone_01', category: 'MapObject_Obje_Island' }],
  [0xa5584e67, { key: 'ObjLighthouse_01', category: 'MapObject_Obje_Island' }],
  [0xa5cc5f51, { key: 'ObjStepWood_06', category: 'MapObject_IslandStep' }],
  [0xa5e069e0, { key: 'ObjArchAir', category: 'MapObject_Obje_Island' }],
  [0xa8278419, { key: 'ObjBeachParasol_03', category: 'MapObject_Obje_Island' }],
  [0xa86f3787, { key: 'ObjPinwheel_01', category: 'MapObject_Obje_Island' }],
  [0xa96ee849, { key: 'ObjSwingRider_06', category: 'MapObject_Obje_Island' }],
  [0xa986b812, { key: 'ObjDrinkingFountain_07', category: 'MapObject_Obje_Island' }],
  [0xaa80eaf3, { key: 'ObjTrafficLight_05', category: 'MapObject_Obje_Island' }],
  [0xaad82ed0, { key: 'ObjBeachParasol_06', category: 'MapObject_Obje_Island' }],
  [0xab25e6df, { key: 'ObjSprinkler_01', category: 'MapObject_Obje_Island' }],
  [0xab8d53d0, { key: 'ObjLighthouse', category: 'MapObject_Obje_Island' }],
  [0xab931526, { key: 'ObjStepWood_07', category: 'MapObject_IslandStep' }],
  [0xacbce196, { key: 'ObjBeachBed_05', category: 'MapObject_Obje_Island' }],
  [0xacc1e99c, { key: 'ObjStepIron_07', category: 'MapObject_IslandStep' }],
  [0xaf35c3de, { key: 'ObjTableBench_06', category: 'MapObject_Obje_Island' }],
  [0xb06856c3, { key: 'ObjBenchHome_01', category: 'MapObject_Obje_Island' }],
  [0xb0a5e205, { key: 'ObjFencePipe_02', category: 'MapObject_Obje_Island' }],
  [0xb15b02a5, { key: 'ObjShowerOutdoor_01', category: 'MapObject_Obje_Island' }],
  [0xb3266b3d, { key: 'ObjTrafficLight_06', category: 'MapObject_Obje_Island' }],
  [0xb33cd644, { key: 'ObjStreetLamp_02', category: 'MapObject_Obje_Island' }],
  [0xb3ede11b, { key: 'ObjTrafficLight_02', category: 'MapObject_Obje_Island' }],
  [0xb3f08ea7, { key: 'FacilityAtelier', category: 'MapObject_Facility_Contents' }],
  [0xb4d25280, { key: 'ObjBenchPark_05', category: 'MapObject_Obje_Island' }],
  [0xb50c8415, { key: 'ObjFenceBarbed_05', category: 'MapObject_Obje_Island' }],
  [0xb536af1d, { key: 'ObjFenceWood_05', category: 'MapObject_Obje_Island' }],
  [0xb5d0afa9, { key: 'FacilityPark', category: 'MapObject_Facility_Location' }],
  [0xb6a77a82, { key: 'ObjFlowerAnemone_02', category: 'MapObject_Obje_Island' }],
  [0xb731114a, { key: 'ObjDrinkingFountain_06', category: 'MapObject_Obje_Island' }],
  [0xb7387ec4, { key: 'ObjJackOLantern_01', category: 'MapObject_Obje_Island' }],
  [0xb8c7b758, { key: 'ObjTreeElectric_01', category: 'MapObject_Obje_Island' }],
  [0xbbee69f3, { key: 'ObjShowerOutdoor_04', category: 'MapObject_Obje_Island' }],
  [0xbc586477, { key: 'ObjFlowerpot', category: 'MapObject_Obje_Island' }],
  [0xbcf0a82b, { key: 'ObjBell_02', category: 'MapObject_Obje_Island' }],
  [0xbd2acdc2, { key: 'ObjFenceIron_02', category: 'MapObject_Obje_Island' }],
  [0xbdd66db4, { key: 'ObjPinwheel_04', category: 'MapObject_Obje_Island' }],
  [0xbf54b785, { key: 'ObjGrandlight_07', category: 'MapObject_Obje_Island' }],
  [0xbf72663f, { key: 'ObjBenchTerrace_03', category: 'MapObject_Obje_Island' }],
  [0xc28ce29d, { key: 'ObjFlowerNarcissus', category: 'MapObject_Obje_Island' }],
  [0xc2f3081d, { key: 'ObjBeachParasol_04', category: 'MapObject_Obje_Island' }],
  [0xc3e9117a, { key: 'ObjBonfire_04', category: 'MapObject_Obje_Island' }],
  [0xc41c1083, { key: 'ObjShowerOutdoor_03', category: 'MapObject_Obje_Island' }],
  [0xc4e7518f, { key: 'ObjBeachParasol_05', category: 'MapObject_Obje_Island' }],
  [0xc4fb9bfa, { key: 'ObjBenchHome_03', category: 'MapObject_Obje_Island' }],
  [0xc55689ab, { key: 'ObjTrashCan_04', category: 'MapObject_Obje_Island' }],
  [0xc5a68179, { key: 'ObjStreetLamp_01', category: 'MapObject_Obje_Island' }],
  [0xc61fdd20, { key: 'ObjGrandlight_06', category: 'MapObject_Obje_Island' }],
  [0xc6221de3, { key: 'ObjArchAir_06', category: 'MapObject_Obje_Island' }],
  [0xc6cfb515, { key: 'ObjFencePipe', category: 'MapObject_Obje_Island' }],
  [0xc76824c1, { key: 'ObjTrafficLight_01', category: 'MapObject_Obje_Island' }],
  [0xc76a3d56, { key: 'ObjAerogenerator_01', category: 'MapObject_Obje_Island' }],
  [0xc8d08275, { key: 'ObjBeachBed_02', category: 'MapObject_Obje_Island' }],
  [0xc8eca18d, { key: 'ObjBenchTerrace_06', category: 'MapObject_Obje_Island' }],
  [0xc90cc3ab, { key: 'ObjAerogenerator', category: 'MapObject_Obje_Island' }],
  [0xc919deb8, { key: 'ObjFencePipe_07', category: 'MapObject_Obje_Island' }],
  [0xc9213dbd, { key: 'ObjBonfire', category: 'MapObject_Obje_Island' }],
  [0xc95cdab5, { key: 'ObjFenceStake_04', category: 'MapObject_Obje_Island' }],
  [0xc9e023ef, { key: 'ObjSeesaw', category: 'MapObject_Obje_Island' }],
  [0xca408743, { key: 'ObjSnowman_02', category: 'MapObject_Obje_Island' }],
  [0xca719626, { key: 'ObjTreeElectric_03', category: 'MapObject_Obje_Island' }],
  [0xcb3caa21, { key: 'ObjPinwheel_02', category: 'MapObject_Obje_Island' }],
  [0xcb816485, { key: 'ObjFenceWood_07', category: 'MapObject_Obje_Island' }],
  [0xcb84668f, { key: 'FacilityBuildingShop', category: 'MapObject_Facility_Shop' }],
  [0xce15d990, { key: 'ObjBenchHome_06', category: 'MapObject_Obje_Island' }],
  [0xce1dd518, { key: 'ObjFlowerpot_06', category: 'MapObject_Obje_Island' }],
  [0xcedb3d13, { key: 'ObjVendingMachine_03', category: 'MapObject_Obje_Island' }],
  [0xd0db48b1, { key: 'ObjLanternSakura_04', category: 'MapObject_Obje_Island' }],
  [0xd13c8ef0, { key: 'ObjShowerOutdoor_07', category: 'MapObject_Obje_Island' }],
  [0xd1808061, { key: 'ObjSafetyCone_04', category: 'MapObject_Obje_Island' }],
  [0xd2dfb97b, { key: 'ObjTrafficLight_03', category: 'MapObject_Obje_Island' }],
  [0xd3442cf3, { key: 'ObjSprinkler', category: 'MapObject_Obje_Island' }],
  [0xd352f0b1, { key: 'ObjRoadSign_01', category: 'MapObject_Obje_Island' }],
  [0xd59d888c, { key: 'ObjSnowman_03', category: 'MapObject_Obje_Island' }],
  [0xd6710462, { key: 'ObjFenceLattice_06', category: 'MapObject_Obje_Island' }],
  [0xd8067590, { key: 'ObjFlowerpot_02', category: 'MapObject_Obje_Island' }],
  [0xd8d4c1dc, { key: 'ObjBeachBed_03', category: 'MapObject_Obje_Island' }],
  [0xd976d4e0, { key: 'ObjStepWood_04', category: 'MapObject_IslandStep' }],
  [0xd97c8cd9, { key: 'ObjTreeElectric_07', category: 'MapObject_Obje_Island' }],
  [0xd9d34019, { key: 'ObjSeesaw_03', category: 'MapObject_Obje_Island' }],
  [0xd9ebcef6, { key: 'ObjStepWood_03', category: 'MapObject_IslandStep' }],
  [0xda9ced52, { key: 'ObjFenceStake', category: 'MapObject_Obje_Island' }],
  [0xdb31941c, { key: 'ObjBenchHome_07', category: 'MapObject_Obje_Island' }],
  [0xdc6fbb0e, { key: 'ObjJackOLantern_06', category: 'MapObject_Obje_Island' }],
  [0xdcad823f, { key: 'ObjSafetyCone_03', category: 'MapObject_Obje_Island' }],
  [0xdd0b050b, { key: 'ObjThrone', category: 'MapObject_Obje_Island' }],
  [0xdf57e997, { key: 'ObjStreetLampRetro_06', category: 'MapObject_Obje_Island' }],
  [0xdfebbd3a, { key: 'ObjSafetyCone_02', category: 'MapObject_Obje_Island' }],
  [0xe03e892e, { key: 'ObjFenceWood_06', category: 'MapObject_Obje_Island' }],
  [0xe04f9b72, { key: 'ObjClockTower_01', category: 'MapObject_Obje_Island' }],
  [0xe2123ede, { key: 'ObjBenchPark_02', category: 'MapObject_Obje_Island' }],
  [0xe21c58eb, { key: 'ObjFlowerNemophila', category: 'MapObject_Obje_Island' }],
  [0xe3e5250b, { key: 'ObjFenceChain', category: 'MapObject_Obje_Island' }],
  [0xe3ec5c38, { key: 'HouseDollHouse', category: 'MapObject_House_Outer' }],
  [0xe40c3e1a, { key: 'ObjAerogenerator_02', category: 'MapObject_Obje_Island' }],
  [0xe4402dca, { key: 'ObjPinwheel_03', category: 'MapObject_Obje_Island' }],
  [0xe4678701, { key: 'ObjBenchHome_05', category: 'MapObject_Obje_Island' }],
  [0xe4a0cabd, { key: 'ObjFenceLattice_07', category: 'MapObject_Obje_Island' }],
  [0xe4e58580, { key: 'ObjStepWood_05', category: 'MapObject_IslandStep' }],
  [0xe55fb97c, { key: 'ObjFenceIron_06', category: 'MapObject_Obje_Island' }],
  [0xe5c37f30, { key: 'ObjGrandlight', category: 'MapObject_Obje_Island' }],
  [0xe5da8d17, { key: 'ObjRock_01', category: 'MapObject_Obje_Island' }],
  [0xe64b9aa7, { key: 'ObjClockTower_05', category: 'MapObject_Obje_Island' }],
  [0xe788268d, { key: 'ObjFenceLattice_03', category: 'MapObject_Obje_Island' }],
  [0xe828641c, { key: 'ObjFlowerSunflowers', category: 'MapObject_Obje_Island' }],
  [0xe8366039, { key: 'ObjBenchPark_06', category: 'MapObject_Obje_Island' }],
  [0xe8c2afb9, { key: 'ObjBenchTerrace_04', category: 'MapObject_Obje_Island' }],
  [0xe9edbef6, { key: 'ObjShowerOutdoor_02', category: 'MapObject_Obje_Island' }],
  [0xea143e9d, { key: 'ObjVendingMachine_05', category: 'MapObject_Obje_Island' }],
  [0xeab6c014, { key: 'ObjPinwheel', category: 'MapObject_Obje_Island' }],
  [0xeaddf790, { key: 'ObjFenceStake_06', category: 'MapObject_Obje_Island' }],
  [0xeb7b494e, { key: 'ObjBell_06', category: 'MapObject_Obje_Island' }],
  [0xebace20b, { key: 'ObjLanternSakura_05', category: 'MapObject_Obje_Island' }],
  [0xec2427f1, { key: 'ObjStepIron_05', category: 'MapObject_IslandStep' }],
  [0xec6ad06f, { key: 'ObjPinwheel_06', category: 'MapObject_Obje_Island' }],
  [0xed687f1e, { key: 'ObjFenceLattice_02', category: 'MapObject_Obje_Island' }],
  [0xedd72100, { key: 'ObjStepWood_02', category: 'MapObject_IslandStep' }],
  [0xee79f224, { key: 'ObjFireworksAerial_02', category: 'MapObject_Obje_Island' }],
  [0xef367ada, { key: 'HouseOneRoom', category: 'MapObject_House_Outer' }],
  [0xef56842d, { key: 'ObjStreetLampRetro_03', category: 'MapObject_Obje_Island' }],
  [0xef9a1dc1, { key: 'ObjFenceLattice', category: 'MapObject_Obje_Island' }],
  [0xefa370e9, { key: 'ObjFlowerCosmos', category: 'MapObject_Obje_Island' }],
  [0xf003e9c0, { key: 'FacilityPawnShop', category: 'MapObject_Facility_Shop' }],
  [0xf045992a, { key: 'ObjJackOLantern_07', category: 'MapObject_Obje_Island' }],
  [0xf082e4ca, { key: 'ObjBeachParasol', category: 'MapObject_Obje_Island' }],
  [0xf27eda3f, { key: 'ObjFenceWood', category: 'MapObject_Obje_Island' }],
  [0xf29bd6d8, { key: 'ObjStepStone', category: 'MapObject_IslandStep' }],
  [0xf4b09c49, { key: 'ObjClockTower', category: 'MapObject_Obje_Island' }],
  [0xf4fac611, { key: 'ObjSignboardTutorial_01', category: 'MapObject_Obje_Island' }],
  [0xf538929a, { key: 'ObjStepIron_01', category: 'MapObject_IslandStep' }],
  [0xf57069ca, { key: 'ObjStreetLampRetro', category: 'MapObject_Obje_Island' }],
  [0xf57fa3a5, { key: 'ObjClockTower_04', category: 'MapObject_Obje_Island' }],
  [0xf5a8c105, { key: 'ObjFenceIron', category: 'MapObject_Obje_Island' }],
  [0xf603348e, { key: 'ObjTrashCan_06', category: 'MapObject_Obje_Island' }],
  [0xf698e38b, { key: 'ObjFlowerAnemone', category: 'MapObject_Obje_Island' }],
  [0xf6ec924d, { key: 'ObjFenceChain_01', category: 'MapObject_Obje_Island' }],
  [0xf767c92e, { key: 'ObjFenceIron_01', category: 'MapObject_Obje_Island' }],
  [0xf8ace4c7, { key: 'ObjBenchPark_04', category: 'MapObject_Obje_Island' }],
  [0xf9e9dd00, { key: 'ObjThrone_06', category: 'MapObject_Obje_Island' }],
  [0xfb12ee2f, { key: 'ObjClockTower_02', category: 'MapObject_Obje_Island' }],
  [0xfcc93164, { key: 'ObjFenceGuardpipe_01', category: 'MapObject_Obje_Island' }],
  [0xfd0ccb79, { key: 'ObjLighthouse_03', category: 'MapObject_Obje_Island' }],
  [0xfd670658, { key: 'ObjSafetyCone_06', category: 'MapObject_Obje_Island' }],
  [0xfd7240b3, { key: 'ObjFenceWood_04', category: 'MapObject_Obje_Island' }],
  [0xfe462c1f, { key: 'ObjDrinkingFountain_03', category: 'MapObject_Obje_Island' }],
  [0xfeb03bcb, { key: 'ObjGuardrail', category: 'MapObject_Obje_Island' }],
  [0xfeccbdce, { key: 'ObjFenceBarbed_07', category: 'MapObject_Obje_Island' }],
  [0xffbee148, { key: 'ObjSeesaw_01', category: 'MapObject_Obje_Island' }],
]);

// Actors without an entry here default to a 1x1 footprint centered on
// the anchor. Verified: every placeable actor in sample/Map.sav with
// a multi-cell model has a WalkingGrid entry; small props do not.
export const DEFAULT_FOOTPRINT: ActorFootprint = { x0: 0, y0: 0, w: 1, h: 1, goalX: 0, goalY: 0 };

export const ACTOR_FOOTPRINT: ReadonlyMap<number, ActorFootprint> = new Map([
  [0x00783c5e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceIron_07 (1×1)
  [0x00f79623, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeBroadleaf (1×1)
  [0x020defc1, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjGuardrail_04 (2×1)
  [0x02783fd0, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjVendingMachine (1×1)
  [0x02a4af54, { x0: 0, y0: 0, w: 3, h: 1, goalX: null, goalY: null }], // ObjArchAir_01 (3×1)
  [0x02b59bf9, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLamp_05 (1×1)
  [0x0335b0a7, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBell_05 (1×1)
  [0x03554f30, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBonfire_06 (1×1)
  [0x04c959f5, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjThrone_05 (1×1)
  [0x06019f97, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBeachParasol_01 (1×1)
  [0x074ffde1, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceLattice_01 (1×1)
  [0x075960d2, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjDrinkingFountain_05 (1×1)
  [0x099363e3, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBonfire_01 (1×1)
  [0x0a29f456, { x0: 0, y0: 0, w: 4, h: 5, goalX: null, goalY: null }], // ObjSignboardTutorial_04 (4×5)
  [0x0a9f39df, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrashCan_02 (1×1)
  [0x0ace805a, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjGrandlight_04 (1×1)
  [0x0b113fde, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjGuardrail_01 (2×1)
  [0x0bc3ad96, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSprinkler_03 (1×1)
  [0x0da9f2cc, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeGinkgo (1×1)
  [0x0daa36aa, { x0: 0, y0: 0, w: 4, h: 5, goalX: null, goalY: null }], // ObjSignboardTutorial_03 (4×5)
  [0x0e62f2f4, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceIron_05 (1×1)
  [0x0ed12c63, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjHedge_05 (2×1)
  [0x0f012cb7, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeBroadleaf_01 (1×1)
  [0x0fc4dae6, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjHedge_01 (2×1)
  [0x1078d5b8, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceLattice_04 (1×1)
  [0x10a05086, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceChain_07 (1×1)
  [0x1116f5d8, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFireworksAerial_01 (1×1)
  [0x118d621c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjThrone_01 (1×1)
  [0x11964275, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceStake_07 (1×1)
  [0x1384d84b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjLanternSakura_02 (1×1)
  [0x143f32d9, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjJackOLantern_02 (2×1)
  [0x16503a9e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjLanternSakura_03 (1×1)
  [0x1680e2f4, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjHedge_03 (2×1)
  [0x16a115fc, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFencePipe_06 (1×1)
  [0x17133c16, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjGuardrail_02 (2×1)
  [0x179104ed, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrafficLight_04 (1×1)
  [0x1835fdab, { x0: 0, y0: 1, w: 2, h: 2, goalX: null, goalY: null }], // ObjTableBench_05 (2×2)
  [0x18bc0888, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjFenceGuardpipe_07 (2×1)
  [0x18c416de, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLamp_04 (1×1)
  [0x19a39056, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBonfire_05 (1×1)
  [0x1a1f3c2e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSnowman (1×1)
  [0x1ad1b47d, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchTerrace_05 (2×1)
  [0x1b2ff9ef, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjJackOLantern_03 (2×1)
  [0x1b96fc41, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLamp (1×1)
  [0x1c2eceb3, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjShowerOutdoor_06 (1×1)
  [0x1cc3f3b5, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjFenceGuardpipe_04 (2×1)
  [0x1d43382b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjRoadSign (1×1)
  [0x1d880003, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjThrone_03 (1×1)
  [0x1db7b2ec, { x0: 0, y0: 1, w: 2, h: 2, goalX: null, goalY: null }], // ObjTableBench_03 (2×2)
  [0x1dd946b9, { x0: 0, y0: 0, w: 2, h: 2, goalX: null, goalY: null }], // ObjLighthouse_02 (2×2)
  [0x1e702ae2, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjDrinkingFountain_02 (1×1)
  [0x1eb0ff5c, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjJackOLantern (2×1)
  [0x1f1eb32d, { x0: -2, y0: -2, w: 6, h: 5, goalX: 0, goalY: 2 }], // FacilityFamilyRestaurant (6×5)
  [0x20e67c30, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceBarbed_02 (1×1)
  [0x22f85aa9, { x0: -1, y0: -1, w: 4, h: 4, goalX: 0, goalY: 2 }], // FacilityItemShop (4×4)
  [0x241cba0a, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBeachBed_04 (2×1)
  [0x256ae934, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeConiferous_01 (1×1)
  [0x2664f7d1, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreePalm (1×1)
  [0x26b0b518, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjVendingMachine_04 (1×1)
  [0x2720d857, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerTulip_02 (1×1)
  [0x27d7affa, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjJackOLantern_05 (2×1)
  [0x28895d61, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerPampasGrass (1×1)
  [0x28898600, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceBarbed_06 (1×1)
  [0x28c866e4, { x0: 0, y0: 0, w: 3, h: 1, goalX: null, goalY: null }], // ObjArchAir_04 (3×1)
  [0x28f121a9, { x0: 0, y0: 0, w: 2, h: 2, goalX: null, goalY: null }], // ObjLighthouse_05 (2×2)
  [0x2cd639c2, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchTerrace_01 (2×1)
  [0x2d70949a, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchHome (2×1)
  [0x2e02fe97, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBell_01 (1×1)
  [0x30ebfc39, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSafetyCone (1×1)
  [0x31e8d694, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeElectric_06 (1×1)
  [0x35042895, { x0: 0, y0: 0, w: 2, h: 2, goalX: null, goalY: null }], // ObjTreeChristmas (2×2)
  [0x3527b759, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjGuardrail_03 (2×1)
  [0x35bc3a6c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBonfire_03 (1×1)
  [0x35ef1762, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeElectric_05 (1×1)
  [0x36147dc4, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBeachBed (2×1)
  [0x3634f451, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjGrandlight_02 (1×1)
  [0x37457636, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSnowman_01 (1×1)
  [0x38c47000, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjFenceGuardpipe_06 (2×1)
  [0x39a31074, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerpot_01 (1×1)
  [0x39bb7d36, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjFenceGuardpipe (2×1)
  [0x3a19045b, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjHedge_02 (2×1)
  [0x3a379430, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchPark (2×1)
  [0x3b21e48e, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchTerrace_07 (2×1)
  [0x3c01c777, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLampRetro_02 (1×1)
  [0x3c040ef5, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStandingTorch (1×1)
  [0x3c266f7e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjClockTower_07 (1×1)
  [0x3c97c599, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSwingRider_05 (1×1)
  [0x3cac27b7, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerpot_03 (1×1)
  [0x3cdfa786, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSwingRider_07 (1×1)
  [0x3de81df5, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBeachParasol_07 (1×1)
  [0x3dfc546b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjPinwheel_07 (1×1)
  [0x3e2ae3d8, { x0: 0, y0: 1, w: 2, h: 2, goalX: null, goalY: null }], // ObjTableBench_04 (2×2)
  [0x3e7dc6f9, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBell_04 (1×1)
  [0x3f360d90, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjGuardrail_05 (2×1)
  [0x3f612d44, { x0: 0, y0: 0, w: 3, h: 1, goalX: null, goalY: null }], // ObjArchAir_07 (3×1)
  [0x408ec56c, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjSeesaw_04 (2×1)
  [0x41436cba, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFireworksErupting (1×1)
  [0x41953204, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFencePipe_01 (1×1)
  [0x4209ab17, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjAerogenerator_05 (1×1)
  [0x434533c8, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjLanternSakura_01 (1×1)
  [0x43f76680, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjFenceGuardpipe_03 (2×1)
  [0x4499cc8c, { x0: -1, y0: -1, w: 4, h: 4, goalX: 1, goalY: 2 }], // FacilityPhotoStudio (4×4)
  [0x45720afc, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceStake_01 (1×1)
  [0x4691b9df, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceWood_03 (1×1)
  [0x48870a72, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjSeesaw_02 (2×1)
  [0x48e1e211, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjHedge (2×1)
  [0x49893c7b, { x0: 0, y0: 0, w: 3, h: 1, goalX: null, goalY: null }], // ObjArchAir_03 (3×1)
  [0x4999d24f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBell_07 (1×1)
  [0x4ad50099, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerpot_05 (1×1)
  [0x4cdf13e3, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeCactus (1×1)
  [0x4d590b0f, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjGuardrail_06 (2×1)
  [0x4e992963, { x0: -1, y0: -1, w: 4, h: 4, goalX: 1, goalY: 2 }], // FacilityTower (4×4)
  [0x4ebe5dff, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBonfire_02 (1×1)
  [0x4f214c75, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceChain_05 (1×1)
  [0x4f2a4a2c, { x0: -1, y0: -1, w: 3, h: 3, goalX: 0, goalY: 1 }], // FacilityMarket (3×3)
  [0x4f31ecab, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerNarcissus_01 (1×1)
  [0x51456fc7, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchTerrace_02 (2×1)
  [0x51f9ebe6, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFencePipe_03 (1×1)
  [0x52249c2d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSprinkler_04 (1×1)
  [0x536c8eeb, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLampRetro_01 (1×1)
  [0x53a5e5b4, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBeachBed_01 (2×1)
  [0x53cdc538, { x0: 0, y0: 1, w: 2, h: 2, goalX: null, goalY: null }], // ObjTableBench_07 (2×2)
  [0x5462e40d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjVendingMachine_01 (1×1)
  [0x5468ea41, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchTerrace (2×1)
  [0x54b486c1, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchHome_04 (2×1)
  [0x555e4971, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLamp_07 (1×1)
  [0x5bc17e5a, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjHedge_06 (2×1)
  [0x5c44bb14, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrashCan_05 (1×1)
  [0x5c80d8f9, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjJackOLantern_04 (2×1)
  [0x5e545d46, { x0: 0, y0: 0, w: 2, h: 2, goalX: null, goalY: null }], // ObjLighthouse_06 (2×2)
  [0x5e8fc05f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrashCan (1×1)
  [0x5ea082c6, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjHedge_04 (2×1)
  [0x5fd51925, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeBroadleaf_02 (1×1)
  [0x60974f1d, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchPark_03 (2×1)
  [0x613e1748, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerTulip_01 (1×1)
  [0x623f9384, { x0: 0, y0: 0, w: 4, h: 5, goalX: null, goalY: null }], // ObjSignboardTutorial (4×5)
  [0x631a5edd, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBeachBed_07 (2×1)
  [0x637d975d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjVendingMachine_02 (1×1)
  [0x639739e4, { x0: -1, y0: -1, w: 4, h: 4, goalX: 1, goalY: 2 }], // FacilitySupermarket (4×4)
  [0x6400ef93, { x0: -1, y0: -1, w: 4, h: 4, goalX: 0, goalY: 2 }], // FacilityInteriorShop (4×4)
  [0x644e5834, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrafficLight (1×1)
  [0x6450a5b6, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLamp_06 (1×1)
  [0x655d2cf0, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLamp_03 (1×1)
  [0x66f4bae5, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceChain_03 (1×1)
  [0x67b54869, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLampRetro_04 (1×1)
  [0x67ddf3cc, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFireworksErupting_01 (1×1)
  [0x68b0500a, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjPinwheel_05 (1×1)
  [0x69c96e86, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSprinkler_02 (1×1)
  [0x69f07ec5, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjRock (1×1)
  [0x6be3ab9c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceChain_06 (1×1)
  [0x6d001ab7, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrafficLight_07 (1×1)
  [0x6dfa5726, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchPark_07 (2×1)
  [0x6e0f5ddc, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjFenceGuardpipe_02 (2×1)
  [0x6e5e424c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerpot_04 (1×1)
  [0x6eb4472b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjDrinkingFountain_04 (1×1)
  [0x6f96359e, { x0: 0, y0: 0, w: 2, h: 2, goalX: null, goalY: null }], // ObjLighthouse_07 (2×2)
  [0x6fe08db1, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSprinkler_05 (1×1)
  [0x708aefeb, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjRock_02 (1×1)
  [0x70ccf14b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeCherry (1×1)
  [0x70f1acbe, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceStake_05 (1×1)
  [0x7137a07c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLampRetro_07 (1×1)
  [0x720fc83f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSwingRider_04 (1×1)
  [0x7277d140, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceStake_02 (1×1)
  [0x72cc4f28, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceChain_04 (1×1)
  [0x72ce0895, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjClockTower_06 (1×1)
  [0x72eb0d7a, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFireworksAerial (1×1)
  [0x7312af8b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceIron_04 (1×1)
  [0x738bd7a2, { x0: -4, y0: -2, w: 9, h: 5, goalX: -1, goalY: 2 }], // FacilityFerrisWheel (9×5)
  [0x739bb804, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchPark_01 (2×1)
  [0x74118a38, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBell (1×1)
  [0x7591362f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceIron_03 (1×1)
  [0x779b5f66, { x0: -2, y0: -4, w: 6, h: 10, goalX: null, goalY: null }], // FacilityFountainPark (6×10)
  [0x77b633dd, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjWeed (1×1)
  [0x793bf08f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceLattice_05 (1×1)
  [0x798cc61e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBell_03 (1×1)
  [0x79aad069, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjShowerOutdoor_05 (1×1)
  [0x7a3313bd, { x0: 0, y0: 0, w: 2, h: 2, goalX: null, goalY: null }], // ObjLighthouse_04 (2×2)
  [0x7ab365bb, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerLavender (1×1)
  [0x7b28f8c4, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSwingRider_03 (1×1)
  [0x7bd6ecbe, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjSeesaw_05 (2×1)
  [0x7bf30ad7, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceChain_02 (1×1)
  [0x7c83a53c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFencePipe_04 (1×1)
  [0x7cb5537a, { x0: 0, y0: 0, w: 4, h: 3, goalX: null, goalY: null }], // FacilityFountain (4×3)
  [0x7cc23163, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSwingRider_01 (1×1)
  [0x7cf73c42, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceBarbed_04 (1×1)
  [0x7f4b7639, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjWeed_01 (1×1)
  [0x7ff35b85, { x0: -1, y0: -1, w: 4, h: 4, goalX: 1, goalY: 2 }], // FacilityClothShop (4×4)
  [0x80273dca, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeElectric (1×1)
  [0x80c4e173, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerTulip (1×1)
  [0x81d8840d, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjSeesaw_06 (2×1)
  [0x821c5664, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSwingRider (1×1)
  [0x8260ac6d, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchHome_02 (2×1)
  [0x8479278d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSafetyCone_05 (1×1)
  [0x852b143a, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjThrone_04 (1×1)
  [0x8653643d, { x0: 0, y0: 0, w: 4, h: 5, goalX: null, goalY: null }], // ObjSignboardTutorial_02 (4×5)
  [0x86adc47d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjAerogenerator_03 (1×1)
  [0x86bf727c, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBeachBed_06 (2×1)
  [0x86e54ef3, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLampRetro_05 (1×1)
  [0x88ad18c8, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceBarbed_03 (1×1)
  [0x893aa4bd, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSwingRider_02 (1×1)
  [0x8959f121, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceWood_01 (1×1)
  [0x89706ab5, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjGrandlight_01 (1×1)
  [0x8c677620, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFencePipe_05 (1×1)
  [0x8ca1ca2a, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjFenceGuardpipe_05 (2×1)
  [0x8ceb9861, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeElectric_04 (1×1)
  [0x8d1d2c86, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjDrinkingFountain (1×1)
  [0x8d42df09, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjShowerOutdoor (1×1)
  [0x8d7ac9e4, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrashCan_01 (1×1)
  [0x8d8ab2f2, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrashCan_03 (1×1)
  [0x8e5b647c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeElectric_02 (1×1)
  [0x8ed43524, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceBarbed_01 (1×1)
  [0x90bd04f1, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceStake_03 (1×1)
  [0x9296757d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceBarbed (1×1)
  [0x92f03864, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjThrone_02 (1×1)
  [0x93acc870, { x0: 0, y0: 0, w: 3, h: 1, goalX: null, goalY: null }], // ObjArchAir_05 (3×1)
  [0x93bfa683, { x0: 0, y0: 1, w: 2, h: 2, goalX: null, goalY: null }], // ObjTableBench_01 (2×2)
  [0x94046edf, { x0: 0, y0: 1, w: 2, h: 2, goalX: null, goalY: null }], // ObjTableBench (2×2)
  [0x94a2b14c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjLanternSakura (1×1)
  [0x95fa4f31, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjClockTower_03 (1×1)
  [0x96b750d7, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceWood_02 (1×1)
  [0x96c0e15a, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjGrandlight_03 (1×1)
  [0x97303927, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjDrinkingFountain_01 (1×1)
  [0x9737f2ae, { x0: 0, y0: 1, w: 2, h: 2, goalX: null, goalY: null }], // ObjTableBench_02 (2×2)
  [0x9818108c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeConiferous (1×1)
  [0x99c0dea5, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjAerogenerator_04 (1×1)
  [0x9a993894, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjGrandlight_05 (1×1)
  [0x9bd11dd8, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFireworksErupting_02 (1×1)
  [0x9cb9f35b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerCosmos_01 (1×1)
  [0x9e3fdc71, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBeachParasol_02 (1×1)
  [0xa02d2f2e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSafetyCone_01 (1×1)
  [0xa14c1b16, { x0: 0, y0: 0, w: 3, h: 1, goalX: null, goalY: null }], // ObjArchAir_02 (3×1)
  [0xa4552121, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerAnemone_01 (1×1)
  [0xa5584e67, { x0: 0, y0: 0, w: 2, h: 2, goalX: null, goalY: null }], // ObjLighthouse_01 (2×2)
  [0xa5e069e0, { x0: 0, y0: 0, w: 3, h: 1, goalX: null, goalY: null }], // ObjArchAir (3×1)
  [0xa8278419, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBeachParasol_03 (1×1)
  [0xa86f3787, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjPinwheel_01 (1×1)
  [0xa96ee849, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSwingRider_06 (1×1)
  [0xa986b812, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjDrinkingFountain_07 (1×1)
  [0xaa80eaf3, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrafficLight_05 (1×1)
  [0xaad82ed0, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBeachParasol_06 (1×1)
  [0xab25e6df, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSprinkler_01 (1×1)
  [0xab8d53d0, { x0: 0, y0: 0, w: 2, h: 2, goalX: null, goalY: null }], // ObjLighthouse (2×2)
  [0xacbce196, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBeachBed_05 (2×1)
  [0xaf35c3de, { x0: 0, y0: 1, w: 2, h: 2, goalX: null, goalY: null }], // ObjTableBench_06 (2×2)
  [0xb06856c3, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchHome_01 (2×1)
  [0xb0a5e205, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFencePipe_02 (1×1)
  [0xb15b02a5, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjShowerOutdoor_01 (1×1)
  [0xb3266b3d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrafficLight_06 (1×1)
  [0xb33cd644, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLamp_02 (1×1)
  [0xb3ede11b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrafficLight_02 (1×1)
  [0xb3f08ea7, { x0: -1, y0: -1, w: 4, h: 4, goalX: 0, goalY: 2 }], // FacilityAtelier (4×4)
  [0xb4d25280, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchPark_05 (2×1)
  [0xb50c8415, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceBarbed_05 (1×1)
  [0xb536af1d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceWood_05 (1×1)
  [0xb5d0afa9, { x0: 0, y0: 0, w: 6, h: 10, goalX: null, goalY: null }], // FacilityPark (6×10)
  [0xb6a77a82, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerAnemone_02 (1×1)
  [0xb731114a, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjDrinkingFountain_06 (1×1)
  [0xb7387ec4, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjJackOLantern_01 (2×1)
  [0xb8c7b758, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeElectric_01 (1×1)
  [0xbbee69f3, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjShowerOutdoor_04 (1×1)
  [0xbc586477, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerpot (1×1)
  [0xbcf0a82b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBell_02 (1×1)
  [0xbd2acdc2, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceIron_02 (1×1)
  [0xbdd66db4, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjPinwheel_04 (1×1)
  [0xbf54b785, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjGrandlight_07 (1×1)
  [0xbf72663f, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchTerrace_03 (2×1)
  [0xc28ce29d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerNarcissus (1×1)
  [0xc2f3081d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBeachParasol_04 (1×1)
  [0xc3e9117a, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBonfire_04 (1×1)
  [0xc41c1083, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjShowerOutdoor_03 (1×1)
  [0xc4e7518f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBeachParasol_05 (1×1)
  [0xc4fb9bfa, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchHome_03 (2×1)
  [0xc55689ab, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrashCan_04 (1×1)
  [0xc5a68179, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLamp_01 (1×1)
  [0xc61fdd20, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjGrandlight_06 (1×1)
  [0xc6221de3, { x0: 0, y0: 0, w: 3, h: 1, goalX: null, goalY: null }], // ObjArchAir_06 (3×1)
  [0xc6cfb515, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFencePipe (1×1)
  [0xc76824c1, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrafficLight_01 (1×1)
  [0xc76a3d56, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjAerogenerator_01 (1×1)
  [0xc8d08275, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBeachBed_02 (2×1)
  [0xc8eca18d, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchTerrace_06 (2×1)
  [0xc90cc3ab, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjAerogenerator (1×1)
  [0xc919deb8, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFencePipe_07 (1×1)
  [0xc9213dbd, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBonfire (1×1)
  [0xc95cdab5, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceStake_04 (1×1)
  [0xc9e023ef, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjSeesaw (2×1)
  [0xca408743, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSnowman_02 (1×1)
  [0xca719626, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeElectric_03 (1×1)
  [0xcb3caa21, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjPinwheel_02 (1×1)
  [0xcb816485, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceWood_07 (1×1)
  [0xcb84668f, { x0: -1, y0: -1, w: 4, h: 4, goalX: 0, goalY: 2 }], // FacilityBuildingShop (4×4)
  [0xce15d990, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchHome_06 (2×1)
  [0xce1dd518, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerpot_06 (1×1)
  [0xcedb3d13, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjVendingMachine_03 (1×1)
  [0xd0db48b1, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjLanternSakura_04 (1×1)
  [0xd13c8ef0, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjShowerOutdoor_07 (1×1)
  [0xd1808061, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSafetyCone_04 (1×1)
  [0xd2dfb97b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrafficLight_03 (1×1)
  [0xd3442cf3, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSprinkler (1×1)
  [0xd352f0b1, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjRoadSign_01 (1×1)
  [0xd59d888c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSnowman_03 (1×1)
  [0xd6710462, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceLattice_06 (1×1)
  [0xd8067590, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerpot_02 (1×1)
  [0xd8d4c1dc, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBeachBed_03 (2×1)
  [0xd97c8cd9, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTreeElectric_07 (1×1)
  [0xd9d34019, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjSeesaw_03 (2×1)
  [0xda9ced52, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceStake (1×1)
  [0xdb31941c, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchHome_07 (2×1)
  [0xdc6fbb0e, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjJackOLantern_06 (2×1)
  [0xdcad823f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSafetyCone_03 (1×1)
  [0xdd0b050b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjThrone (1×1)
  [0xdf57e997, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLampRetro_06 (1×1)
  [0xdfebbd3a, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSafetyCone_02 (1×1)
  [0xe03e892e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceWood_06 (1×1)
  [0xe04f9b72, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjClockTower_01 (1×1)
  [0xe2123ede, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchPark_02 (2×1)
  [0xe21c58eb, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerNemophila (1×1)
  [0xe3e5250b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceChain (1×1)
  [0xe3ec5c38, { x0: -2, y0: -1, w: 6, h: 4, goalX: 2, goalY: 2 }], // HouseDollHouse (6×4)
  [0xe40c3e1a, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjAerogenerator_02 (1×1)
  [0xe4402dca, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjPinwheel_03 (1×1)
  [0xe4678701, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchHome_05 (2×1)
  [0xe4a0cabd, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceLattice_07 (1×1)
  [0xe55fb97c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceIron_06 (1×1)
  [0xe5c37f30, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjGrandlight (1×1)
  [0xe5da8d17, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjRock_01 (1×1)
  [0xe64b9aa7, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjClockTower_05 (1×1)
  [0xe788268d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceLattice_03 (1×1)
  [0xe828641c, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerSunflowers (1×1)
  [0xe8366039, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchPark_06 (2×1)
  [0xe8c2afb9, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchTerrace_04 (2×1)
  [0xe9edbef6, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjShowerOutdoor_02 (1×1)
  [0xea143e9d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjVendingMachine_05 (1×1)
  [0xeab6c014, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjPinwheel (1×1)
  [0xeaddf790, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceStake_06 (1×1)
  [0xeb7b494e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBell_06 (1×1)
  [0xebace20b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjLanternSakura_05 (1×1)
  [0xec6ad06f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjPinwheel_06 (1×1)
  [0xed687f1e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceLattice_02 (1×1)
  [0xee79f224, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFireworksAerial_02 (1×1)
  [0xef367ada, { x0: -1, y0: -1, w: 3, h: 4, goalX: 0, goalY: 2 }], // HouseOneRoom (3×4)
  [0xef56842d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLampRetro_03 (1×1)
  [0xef9a1dc1, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceLattice (1×1)
  [0xefa370e9, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerCosmos (1×1)
  [0xf003e9c0, { x0: -1, y0: -1, w: 4, h: 4, goalX: 1, goalY: 2 }], // FacilityPawnShop (4×4)
  [0xf045992a, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjJackOLantern_07 (2×1)
  [0xf082e4ca, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjBeachParasol (1×1)
  [0xf27eda3f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceWood (1×1)
  [0xf4b09c49, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjClockTower (1×1)
  [0xf4fac611, { x0: 0, y0: 0, w: 4, h: 5, goalX: null, goalY: null }], // ObjSignboardTutorial_01 (4×5)
  [0xf57069ca, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjStreetLampRetro (1×1)
  [0xf57fa3a5, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjClockTower_04 (1×1)
  [0xf5a8c105, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceIron (1×1)
  [0xf603348e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjTrashCan_06 (1×1)
  [0xf698e38b, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFlowerAnemone (1×1)
  [0xf6ec924d, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceChain_01 (1×1)
  [0xf767c92e, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceIron_01 (1×1)
  [0xf8ace4c7, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjBenchPark_04 (2×1)
  [0xf9e9dd00, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjThrone_06 (1×1)
  [0xfb12ee2f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjClockTower_02 (1×1)
  [0xfcc93164, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjFenceGuardpipe_01 (2×1)
  [0xfd0ccb79, { x0: 0, y0: 0, w: 2, h: 2, goalX: null, goalY: null }], // ObjLighthouse_03 (2×2)
  [0xfd670658, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjSafetyCone_06 (1×1)
  [0xfd7240b3, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceWood_04 (1×1)
  [0xfe462c1f, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjDrinkingFountain_03 (1×1)
  [0xfeb03bcb, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjGuardrail (2×1)
  [0xfeccbdce, { x0: 0, y0: 0, w: 1, h: 1, goalX: null, goalY: null }], // ObjFenceBarbed_07 (1×1)
  [0xffbee148, { x0: 0, y0: 0, w: 2, h: 1, goalX: null, goalY: null }], // ObjSeesaw_01 (2×1)
]);
