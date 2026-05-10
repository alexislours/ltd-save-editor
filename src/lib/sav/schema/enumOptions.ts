export const OBTAIN_STATE = ['Lock', 'New', 'Arrived', 'Opened', 'Obtained'] as const;

export const OWNERSHIP = ['NeverOwned', 'Unown', 'Own'] as const;

export const LANGUAGE = [
  'JPja',
  'USen',
  'USes',
  'USfr',
  'USpt',
  'EUen',
  'EUes',
  'EUfr',
  'EUde',
  'EUit',
  'EUpt',
  'EUnl',
  'EUru',
  'KRko',
  'CNzh',
  'TWzh',
] as const;

export const TEXTURE_SOURCE = [
  'None',
  'ContentTex',
  'ContentIcon',
  'SaveDataUgc',
  'SaveDataUgcBntx',
  'SaveDataUgcRgba',
  'SaveDataUgcBc1',
  'SaveDataUgcBc3',
  'SaveDataUgcBc3_SRGB',
  'SaveDataUgcBc1_Bc3SRGB',
  'HostIOUgc',
  'HostIOUgcRgba',
  'HostIOUgcBc1',
  'HostIOUgcBc3',
  'HostIOUgcBc3_SRGB',
  'HostIOUgcBc1_Bc3SRGB',
  'ContentUgcRgba',
  'ContentUgcBc1',
  'ContentUgcBc3',
  'ContentUgcBc3_SRGB',
  'ContentUgcBc1_Bc3SRGB',
  'SaveDataPhotoHalf',
  'SaveDataPhotoQuarter',
  'SaveDataPhotoRgba',
  'HostIOPhotoHalf',
  'HostIOPhotoQuarter',
  'HostIOPhotoRgba',
  'LocalUgcRgba',
  'LocalUgcBc1',
  'LocalUgcBc3',
  'LocalUgcBc3_SRGB',
  'LocalUgcBc1_Bc3SRGB',
] as const;

export const GRAMMAR_GENDER = ['cNone', 'cMasculine', 'cFeminine', 'cNeuter'] as const;

export const GRAMMAR_NUMBER = ['cSingular', 'cPlural', 'cSingularPossessive'] as const;

export const MATERIAL_FINISH = ['Matte', 'Gloss', 'Metal'] as const;

export const STYLE_MOOD = ['Simple', 'Fun', 'Warmly', 'Creepy', 'Rare', 'Dignified'] as const;

export const SOUND_SLOT = [
  'Sound_00',
  'Sound_01',
  'Sound_02',
  'Sound_03',
  'Sound_04',
  'Sound_05',
  'Sound_06',
  'Sound_07',
  'Sound_08',
  'Sound_09',
] as const;

export const CLOTH_STYLE_GENDER = ['Invalid', 'Male', 'Female', 'Both'] as const;

export const MAP_OBJECT_SHAPE = [
  'Invalid',
  'Cube',
  'Cone',
  'Cylinder',
  'Sphere',
  'Octahedron',
  'Pyramid',
  'Prism',
  'Egg',
  'Invalid_Billboard',
  'Plate',
  'HalfBall',
  'Deltaroof',
  'FloorBoard',
  'Pyramidroof',
  'Coneroof',
  'Domeroof',
] as const;

export const CLOTH_GENRE = ['Normal', 'Business', 'Party', 'Uniform', 'Outdoor', 'Sports'] as const;

export const WORD_KIND = [
  'Invalid',
  'TalkStart',
  'TalkEnd',
  'Phrase',
  'Happy',
  'Sad',
  'Angry',
  'Greeting',
  'TalkInSleep',
  'ShoutToSea',
  'BeforeEat',
] as const;

export const TOUCH_FEEL = [
  'Invalid',
  'Normal',
  'Smooth',
  'Tender',
  'Prickly',
  'Hot',
  'Cold',
  'Humid',
] as const;

export const FLOOR_MATERIAL = [
  'Grass',
  'Soil',
  'Sand',
  'Stone',
  'Wood',
  'Metal',
  'Water',
  'Other',
] as const;

export const MII_GENDER = ['Invalid', 'Male', 'Female', 'Third'] as const;

export const SEASON = ['All', 'Spring', 'Summer', 'Autumn', 'Winter'] as const;

export const GOODS_TYPE = ['Invalid', 'Book', 'CD', 'DVD', 'Game', 'Pet', 'Other'] as const;

export const CONTENT_KIND = [
  'Invalid',
  'Actor',
  'Food',
  'Goods',
  'Cloth',
  'Coordinate',
  'MapObject',
  'MapFloor',
  'UgcFood',
  'UgcGoods',
  'UgcCloth',
  'UgcMapObject',
  'UgcMapFloor',
  'Travel',
  'Phrase',
  'Habit',
  'Money',
  'Wall',
  'RoomFloor',
  'RoomStyle',
  'UgcInterior',
  'UgcExterior',
  'Universal',
  'Mii',
] as const;

export const FLOOR_COST_LEVEL = ['Normal', 'High'] as const;

export const CLOTHING_GENDER = ['Unisex', 'Men', 'Women'] as const;

export const SCENT = [
  'Invalid',
  'NoSmell',
  'Good',
  'Stink',
  'Pungent',
  'Natural',
  'Burnt',
] as const;

export const PRONOUN = ['Unset', 'He', 'She', 'They'] as const;

export const INTERIOR_MATERIAL = [
  'Grass',
  'Space',
  'Sand',
  'Wood',
  'Stone',
  'Cloth',
  'Metal',
  'Digital',
  'Water',
  'Other',
] as const;

export const LOOK_ATTR = [
  'Invalid',
  'Normal',
  'Pretty',
  'SeemsFun',
  'Dirty',
  'Nature',
  'Eerie',
  'Functional',
] as const;

export const VOICE_PRESET = [
  'Pet',
  'System',
  'Custom',
  'Boy',
  'Girl',
  'Male',
  'Female',
  'OldMan',
  'OldWoman',
  'BigCharacter',
  'SmallCharacter',
  'RobotL',
  'RobotS',
] as const;

export const CLOTH_TYPE = [
  'Invalid',
  'EasyH',
  'TShirtN',
  'TShirtH',
  'TShirtL',
  'TopsLongAlineN',
  'TopsLongAlineH',
  'TopsLongAlineL',
  'Robe',
  'Dress',
  'SkirtS',
  'SkirtL',
  'PantsM',
  'PantsL',
  'Cap',
  'Costume',
  'Hat',
] as const;

export const REGION = [
  'Invalid',
  'Japan',
  'Europe',
  'NorthAmerica',
  'SouthAmericaN',
  'SouthAmericaS',
  'Australia',
  'Asia',
  'OthersN',
  'OthersS',
] as const;

export const FEELING = [
  'None',
  'Normal',
  'Good',
  'Irritate',
  'Deject',
  'Careless',
  'Angry',
  'Depress',
  'Worry',
] as const;

export const TASTE = ['None', 'Sweet', 'Spicy', 'Salty', 'Sour', 'Oily', 'Awful'] as const;

export const REGION_CODE = [
  'Invalid',
  'Japan',
  'Usa',
  'Europe',
  'Australia',
  'HongKongTaiwanKorea',
  'China',
] as const;

export const PET_VOICE_EFFECT = [
  'None',
  'PetWater',
  'PetRobot',
  'PetShiny',
  'PetGloomy',
  'PetInsect',
] as const;

export const AGE_TYPE = ['Invalid', 'Adult', 'Child'] as const;

export const HEADWEAR_KIND = ['Invalid', 'Cap', 'Costume', 'Hat'] as const;

export const PET_DIRECTION = ['LeftForward', 'RightForward'] as const;

export const AGE_TYPE_OPTIONAL = ['None', 'Adult', 'Child'] as const;

export const CLOTH_AREA = [
  'Invalid',
  'All',
  'Topslong',
  'Tops',
  'BottomsA',
  'BottomsB',
  'Shoes',
  'Accessory',
  'Headwear',
] as const;

export const TEMPERATURE = ['Normal', 'Hot', 'Cool'] as const;

export const FOOD_KIND = [
  'None',
  'Vegetable',
  'Meat',
  'Fish',
  'Rice',
  'Noodle',
  'Bread',
  'Drink',
  'Confectionery',
  'Fruit',
  'Egg',
] as const;

export const FAMILY_RELATION = [
  'Invalid',
  'Other',
  'Partner',
  'Parent',
  'Child',
  'BrotherSisterOlder',
  'BrotherSisterYounger',
  'GrandParent',
  'GrandChild',
  'Relative',
] as const;

export const EDITOR_MODE = ['Pro', 'Simple'] as const;

export const PET_BEHAVIOR = ['Skipping', 'Hopping', 'Flying', 'Slowly', 'Swimming'] as const;

export const EFFECT_SLOT = [
  'Effect_00',
  'Effect_01',
  'Effect_02',
  'Effect_03',
  'Effect_04',
  'Effect_05',
  'Effect_06',
  'Effect_07',
] as const;

export const SENTIMENT = ['Neutral', 'Positive', 'Negative'] as const;

export const GOODS_FEATURE = [
  'None',
  'Funny',
  'Impression',
  'Horror',
  'Discovery',
  'Difficult',
  'Ashamed',
] as const;

export const BOOK_SIDE = ['Both', 'SideL', 'SideR'] as const;

export const RELATION = [
  'Invalid',
  'Other',
  'Know',
  'Friend',
  'ExFriend',
  'Lover',
  'ExLover',
  'Couple',
  'Divorce',
  'Parent',
  'Child',
  'BrotherSisterOlder',
  'BrotherSisterYounger',
  'GrandParent',
  'GrandChild',
  'Relative',
] as const;

export const UGC_KIND = [
  'Invalid',
  'Food',
  'Goods',
  'Cloth',
  'MapObject',
  'MapFloor',
  'Interior',
  'Exterior',
  'FacePaint',
] as const;

export const ADDRESS_FORM = ['CustomThirdPerson', 'SecondPerson', 'MiiName'] as const;

export const EDITOR_TOOL = ['Loupe', 'Picker', 'Eraser', 'Shift'] as const;

export const PET_SLOT = [
  'None',
  'Pet00',
  'Pet01',
  'Pet02',
  'Pet03',
  'Pet04',
  'Pet05',
  'Pet06',
  'Pet07',
  'Pet08',
  'Pet09',
] as const;

export const HEMISPHERE = ['Invalid', 'North', 'South'] as const;

export const EDITOR_THEME = ['White', 'Black'] as const;

export const TEXT_GENRE = [
  'Invalid',
  'Person',
  'Object',
  'Action',
  'Image',
  'Topic',
  'Phrase',
] as const;

export const CURRENCY = [
  'Invalid',
  'Yen',
  'Dollar',
  'Euro',
  'Pound',
  'AsiaDollar',
  'Won',
  'Yuan',
  'Rouble',
  'Peso',
  'GeneralUse',
] as const;

export const GRID_SIZE = ['None', 'Large', 'Middle', 'Small'] as const;
