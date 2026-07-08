/**
 * 拼豆常见颜色参考库
 * 收录 Perler（美国）、Artkal（中国）、Hama（德国）、Nabbi（瑞典）四大主流品牌的常用色号对照
 * 颜色按色系分组，方便用户对照选购
 */

export interface BeadColor {
  hex: string;
  name: string;
  /** i18n 翻译键，未提供时英文环境回退到 hex */
  nameKey?: string;
  perler?: string;
  artkal?: string;
  hama?: string;
  /** 瑞典品牌：Nabbi */
  nabbi?: string;
  /** 国内品牌：咪小窝 */
  mixiaowo?: string;
  /** 国内品牌：漫漫 */
  manman?: string;
  /** 国内品牌：COCO */
  coco?: string;
}

export interface ColorGroup {
  name: string;
  /** i18n 翻译键，用于渲染色组标题 */
  nameKey: string;
  colors: BeadColor[];
}

export const BEAD_COLOR_GROUPS: ColorGroup[] = [
  {
    name: '白色系',
    nameKey: 'colorGroup.white',
    colors: [
      { hex: '#FFFFFF', name: '纯白', perler: 'P-01', artkal: 'A-01', hama: 'H-01', nabbi: 'N-01' },
      { hex: '#F5F5DC', name: '米白', perler: 'P-02', artkal: 'A-02', hama: 'H-02', nabbi: 'N-02' },
      { hex: '#FAF0E6', name: '亚麻白', perler: 'P-03', artkal: 'A-03', hama: 'H-04', nabbi: 'N-03' },
      { hex: '#E8E8E8', name: '浅灰白', perler: 'P-04', artkal: 'A-04', hama: 'H-03', nabbi: 'N-04' },
    ],
  },
  {
    name: '黑色系',
    nameKey: 'colorGroup.black',
    colors: [
      { hex: '#000000', name: '纯黑', perler: 'P-12', artkal: 'A-12', hama: 'H-12', nabbi: 'N-12' },
      { hex: '#1A1A1A', name: '墨黑', perler: 'P-13', artkal: 'A-13', hama: 'H-13', nabbi: 'N-13' },
      { hex: '#2F2F2F', name: '深灰', perler: 'P-14', artkal: 'A-14', hama: 'H-14', nabbi: 'N-14' },
      { hex: '#4A4A4A', name: '中灰', perler: 'P-15', artkal: 'A-15', hama: 'H-15', nabbi: 'N-15' },
      { hex: '#808080', name: '灰', perler: 'P-16', artkal: 'A-16', hama: 'H-16', nabbi: 'N-16' },
      { hex: '#A9A9A9', name: '浅灰', perler: 'P-17', artkal: 'A-17', hama: 'H-17', nabbi: 'N-17' },
      { hex: '#C0C0C0', name: '银灰', perler: 'P-18', artkal: 'A-18', hama: 'H-18', nabbi: 'N-18' },
    ],
  },
  {
    name: '红色系',
    nameKey: 'colorGroup.red',
    colors: [
      { hex: '#FF0000', name: '正红', perler: 'P-21', artkal: 'A-21', hama: 'H-21', nabbi: 'N-21' },
      { hex: '#DC143C', name: '深红', perler: 'P-22', artkal: 'A-22', hama: 'H-22', nabbi: 'N-22' },
      { hex: '#B22222', name: '暗红', perler: 'P-23', artkal: 'A-23', hama: 'H-23', nabbi: 'N-23' },
      { hex: '#8B0000', name: '酒红', perler: 'P-24', artkal: 'A-24', hama: 'H-24', nabbi: 'N-24' },
      { hex: '#FF6347', name: '番茄红', perler: 'P-25', artkal: 'A-25', hama: 'H-25', nabbi: 'N-25' },
      { hex: '#FF7F50', name: '珊瑚红', perler: 'P-26', artkal: 'A-26', hama: 'H-26', nabbi: 'N-26' },
      { hex: '#E9967A', name: '深鲑鱼色', perler: 'P-27', artkal: 'A-27', hama: 'H-27', nabbi: 'N-27' },
      { hex: '#FA8072', name: '鲑鱼色', perler: 'P-28', artkal: 'A-28', hama: 'H-28', nabbi: 'N-28' },
    ],
  },
  {
    name: '粉色系',
    nameKey: 'colorGroup.pink',
    colors: [
      { hex: '#FFC0CB', name: '浅粉', perler: 'P-31', artkal: 'A-31', hama: 'H-31', nabbi: 'N-31' },
      { hex: '#FFB6C1', name: '亮粉', perler: 'P-32', artkal: 'A-32', hama: 'H-32', nabbi: 'N-32' },
      { hex: '#FF69B4', name: '热粉', perler: 'P-33', artkal: 'A-33', hama: 'H-33', nabbi: 'N-33' },
      { hex: '#FF1493', name: '深粉', perler: 'P-34', artkal: 'A-34', hama: 'H-34', nabbi: 'N-34' },
      { hex: '#DB7093', name: '苍紫罗兰', perler: 'P-35', artkal: 'A-35', hama: 'H-35', nabbi: 'N-35' },
      { hex: '#C71585', name: '中紫罗兰', perler: 'P-36', artkal: 'A-36', hama: 'H-36', nabbi: 'N-36' },
      { hex: '#FFE4E1', name: '薄雾玫瑰', perler: 'P-37', artkal: 'A-37', hama: 'H-37', nabbi: 'N-37' },
    ],
  },
  {
    name: '橙色系',
    nameKey: 'colorGroup.orange',
    colors: [
      { hex: '#FFA500', name: '橙色', perler: 'P-41', artkal: 'A-41', hama: 'H-41', nabbi: 'N-41' },
      { hex: '#FF8C00', name: '暗橙', perler: 'P-42', artkal: 'A-42', hama: 'H-42', nabbi: 'N-42' },
      { hex: '#FF7F00', name: '深橙', perler: 'P-43', artkal: 'A-43', hama: 'H-43', nabbi: 'N-43' },
      { hex: '#FFD700', name: '金色', perler: 'P-44', artkal: 'A-44', hama: 'H-44', nabbi: 'N-44' },
      { hex: '#DAA520', name: '深金', perler: 'P-45', artkal: 'A-45', hama: 'H-45', nabbi: 'N-45' },
      { hex: '#B8860B', name: '暗金', perler: 'P-46', artkal: 'A-46', hama: 'H-46', nabbi: 'N-46' },
      { hex: '#CD853F', name: '秘鲁色', perler: 'P-47', artkal: 'A-47', hama: 'H-47', nabbi: 'N-47' },
    ],
  },
  {
    name: '黄色系',
    nameKey: 'colorGroup.yellow',
    colors: [
      { hex: '#FFFF00', name: '亮黄', perler: 'P-51', artkal: 'A-51', hama: 'H-51', nabbi: 'N-51' },
      { hex: '#FFD700', name: '金黄', perler: 'P-52', artkal: 'A-52', hama: 'H-52', nabbi: 'N-52' },
      { hex: '#FFEF00', name: '柠檬黄', perler: 'P-53', artkal: 'A-53', hama: 'H-53', nabbi: 'N-53' },
      { hex: '#F0E68C', name: '卡其', perler: 'P-54', artkal: 'A-54', hama: 'H-54', nabbi: 'N-54' },
      { hex: '#EEE8AA', name: '苍卡其', perler: 'P-55', artkal: 'A-55', hama: 'H-55', nabbi: 'N-55' },
      { hex: '#BDB76B', name: '暗卡其', perler: 'P-56', artkal: 'A-56', hama: 'H-56', nabbi: 'N-56' },
    ],
  },
  {
    name: '绿色系',
    nameKey: 'colorGroup.green',
    colors: [
      { hex: '#00FF00', name: '亮绿', perler: 'P-61', artkal: 'A-61', hama: 'H-61', nabbi: 'N-61' },
      { hex: '#008000', name: '绿色', perler: 'P-62', artkal: 'A-62', hama: 'H-62', nabbi: 'N-62' },
      { hex: '#228B22', name: '森林绿', perler: 'P-63', artkal: 'A-63', hama: 'H-63', nabbi: 'N-63' },
      { hex: '#2E8B57', name: '海绿', perler: 'P-64', artkal: 'A-64', hama: 'H-64', nabbi: 'N-64' },
      { hex: '#3CB371', name: '中海绿', perler: 'P-65', artkal: 'A-65', hama: 'H-65', nabbi: 'N-65' },
      { hex: '#90EE90', name: '浅绿', perler: 'P-66', artkal: 'A-66', hama: 'H-66', nabbi: 'N-66' },
      { hex: '#98FB98', name: '苍绿', perler: 'P-67', artkal: 'A-67', hama: 'H-67', nabbi: 'N-67' },
      { hex: '#8FBC8F', name: '暗海绿', perler: 'P-68', artkal: 'A-68', hama: 'H-68', nabbi: 'N-68' },
      { hex: '#556B2F', name: '暗橄榄绿', perler: 'P-69', artkal: 'A-69', hama: 'H-69', nabbi: 'N-69' },
      { hex: '#6B8E23', name: '橄榄褐', perler: 'P-70', artkal: 'A-70', hama: 'H-70', nabbi: 'N-70' },
    ],
  },
  {
    name: '青色系',
    nameKey: 'colorGroup.cyan',
    colors: [
      { hex: '#00FFFF', name: '青色', perler: 'P-71', artkal: 'A-71', hama: 'H-71', nabbi: 'N-71' },
      { hex: '#00CED1', name: '暗绿松石', perler: 'P-72', artkal: 'A-72', hama: 'H-72', nabbi: 'N-72' },
      { hex: '#40E0D0', name: '绿松石', perler: 'P-73', artkal: 'A-73', hama: 'H-73', nabbi: 'N-73' },
      { hex: '#48D1CC', name: '中绿松石', perler: 'P-74', artkal: 'A-74', hama: 'H-74', nabbi: 'N-74' },
      { hex: '#20B2AA', name: '浅海绿', perler: 'P-75', artkal: 'A-75', hama: 'H-75', nabbi: 'N-75' },
      { hex: '#5F9EA0', name: '军绿蓝', perler: 'P-76', artkal: 'A-76', hama: 'H-76', nabbi: 'N-76' },
    ],
  },
  {
    name: '蓝色系',
    nameKey: 'colorGroup.blue',
    colors: [
      { hex: '#0000FF', name: '蓝色', perler: 'P-81', artkal: 'A-81', hama: 'H-81', nabbi: 'N-81' },
      { hex: '#0000CD', name: '中蓝', perler: 'P-82', artkal: 'A-82', hama: 'H-82', nabbi: 'N-82' },
      { hex: '#00008B', name: '暗蓝', perler: 'P-83', artkal: 'A-83', hama: 'H-83', nabbi: 'N-83' },
      { hex: '#000080', name: '海军蓝', perler: 'P-84', artkal: 'A-84', hama: 'H-84', nabbi: 'N-84' },
      { hex: '#4169E1', name: '皇家蓝', perler: 'P-85', artkal: 'A-85', hama: 'H-85', nabbi: 'N-85' },
      { hex: '#1E90FF', name: '道奇蓝', perler: 'P-86', artkal: 'A-86', hama: 'H-86', nabbi: 'N-86' },
      { hex: '#6495ED', name: '矢车菊蓝', perler: 'P-87', artkal: 'A-87', hama: 'H-87', nabbi: 'N-87' },
      { hex: '#87CEEB', name: '天蓝', perler: 'P-88', artkal: 'A-88', hama: 'H-88', nabbi: 'N-88' },
      { hex: '#87CEFA', name: '亮天蓝', perler: 'P-89', artkal: 'A-89', hama: 'H-89', nabbi: 'N-89' },
      { hex: '#ADD8E6', name: '浅蓝', perler: 'P-90', artkal: 'A-90', hama: 'H-90', nabbi: 'N-90' },
      { hex: '#B0E0E6', name: '火药蓝', perler: 'P-91', artkal: 'A-91', hama: 'H-91', nabbi: 'N-91' },
    ],
  },
  {
    name: '紫色系',
    nameKey: 'colorGroup.purple',
    colors: [
      { hex: '#800080', name: '紫色', perler: 'P-101', artkal: 'A-101', hama: 'H-101', nabbi: 'N-101' },
      { hex: '#8B008B', name: '深紫', perler: 'P-102', artkal: 'A-102', hama: 'H-102', nabbi: 'N-102' },
      { hex: '#9370DB', name: '中紫', perler: 'P-103', artkal: 'A-103', hama: 'H-103', nabbi: 'N-103' },
      { hex: '#BA55D3', name: '兰花紫', perler: 'P-104', artkal: 'A-104', hama: 'H-104', nabbi: 'N-104' },
      { hex: '#DDA0DD', name: '梅花紫', perler: 'P-105', artkal: 'A-105', hama: 'H-105', nabbi: 'N-105' },
      { hex: '#EE82EE', name: '紫罗兰', perler: 'P-106', artkal: 'A-106', hama: 'H-106', nabbi: 'N-106' },
      { hex: '#FF00FF', name: '洋红', perler: 'P-107', artkal: 'A-107', hama: 'H-107', nabbi: 'N-107' },
      { hex: '#DA70D6', name: '兰花色', perler: 'P-108', artkal: 'A-108', hama: 'H-108', nabbi: 'N-108' },
    ],
  },
  {
    name: '棕色系',
    nameKey: 'colorGroup.brown',
    colors: [
      { hex: '#8B4513', name: '马鞍棕', perler: 'P-111', artkal: 'A-111', hama: 'H-111', nabbi: 'N-111' },
      { hex: '#A0522D', name: '赭色', perler: 'P-112', artkal: 'A-112', hama: 'H-112', nabbi: 'N-112' },
      { hex: '#D2691E', name: '巧克力色', perler: 'P-113', artkal: 'A-113', hama: 'H-113', nabbi: 'N-113' },
      { hex: '#CD853F', name: '秘鲁色', perler: 'P-114', artkal: 'A-114', hama: 'H-114', nabbi: 'N-114' },
      { hex: '#F4A460', name: '沙棕', perler: 'P-115', artkal: 'A-115', hama: 'H-115', nabbi: 'N-115' },
      { hex: '#DEB887', name: '硬木色', perler: 'P-116', artkal: 'A-116', hama: 'H-116', nabbi: 'N-116' },
      { hex: '#D2B48C', name: '棕褐', perler: 'P-117', artkal: 'A-117', hama: 'H-117', nabbi: 'N-117' },
      { hex: '#BC8F8F', name: '玫瑰棕', perler: 'P-118', artkal: 'A-118', hama: 'H-118', nabbi: 'N-118' },
      { hex: '#FFE4B5', name: '鹿皮色', perler: 'P-119', artkal: 'A-119', hama: 'H-119', nabbi: 'N-119' },
      { hex: '#FFDEAD', name: '纳瓦霍白', perler: 'P-120', artkal: 'A-120', hama: 'H-120', nabbi: 'N-120' },
    ],
  },
  {
    name: '肤色系',
    nameKey: 'colorGroup.skin',
    colors: [
      { hex: '#FFDAB9', name: '肤色', perler: 'P-121', artkal: 'A-121', hama: 'H-121', nabbi: 'N-121' },
      { hex: '#FFE4C4', name: '浅肤色', perler: 'P-122', artkal: 'A-122', hama: 'H-122', nabbi: 'N-122' },
      { hex: '#F5DEB3', name: '小麦色', perler: 'P-123', artkal: 'A-123', hama: 'H-123', nabbi: 'N-123' },
      { hex: '#FAEBD7', name: '古董白', perler: 'P-124', artkal: 'A-124', hama: 'H-124', nabbi: 'N-124' },
      { hex: '#E0AC69', name: '深肤色', perler: 'P-125', artkal: 'A-125', hama: 'H-125', nabbi: 'N-125' },
      { hex: '#C68642', name: '麦色', perler: 'P-126', artkal: 'A-126', hama: 'H-126', nabbi: 'N-126' },
      { hex: '#8D5524', name: '棕色肤色', perler: 'P-127', artkal: 'A-127', hama: 'H-127', nabbi: 'N-127' },
    ],
  },
];
