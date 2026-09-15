// ==UserScript==
// @name         ExHentai 标签提取器
// @namespace    ExHentai-Tag-Extractor
// @version      2.3
// @description  从 ExHentai/E-Hentai 提取标签，支持中文翻译和自定义翻译管理
// @author       https://t.me/BGG_Comics
// @homepage     https://t.me/BGG_Comics
// @supportURL   https://t.me/BGG_Comics
// @license      MIT
// @match        *://exhentai.org/g/*
// @match        *://e-hentai.org/g/*
// @icon         https://www.exhentai.org/favicon.ico
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-end
// @downloadURL https://update.sleazyfork.org/scripts/595852/ExHentai%20%E6%A0%87%E7%AD%BE%E6%8F%90%E5%8F%96%E5%99%A8.user.js
// @updateURL https://update.sleazyfork.org/scripts/595852/ExHentai%20%E6%A0%87%E7%AD%BE%E6%8F%90%E5%8F%96%E5%99%A8.meta.js
// ==/UserScript==


(function() {
    'use strict';

    // 分类顺序
    const categoryOrder = ['reclass', 'language', 'parody', 'character', 'group', 'artist', 'female', 'male', 'mixed', 'location', 'other'];

    // 分类名翻译
    const categoryNames = {
        'reclass': '重新分类',
        'language': '语言',
        'parody': '原作',
        'character': '角色',
        'group': '团队',
        'artist': '画师',
        'female': '女性',
        'male': '男性',
        'mixed': '混合',
        'location': '地点',
        'other': '其它'
    };

    // 标签值翻译
    const tagTranslations = {
        '3d': '3D',
        '3d imageset': '3D图片集',
        'abortion': '堕胎',
        'absorption': '吸收',
        'additional eyes': '多眼',
        'adventitious mouth': '畸位口',
        'adventitious penis': '畸位阴茎',
        'adventitious vagina': '畸位阴道',
        'adventitious vagina': '畸位阴道',
        'afrikaans': '南非语',
        'afro': '爆炸头',
        'age progression': '年龄增长',
        'age regression': '返老还童',
        'ahegao': '阿黑颜',
        'ai generated': 'AI生成',
        'albanian': '阿尔巴尼亚语',
        'albino': '白化',
        'alien': '外星人',
        'alien girl': '外星女',
        'all the way through': '消化道贯穿',
        'already uploaded': '已上传',
        'amputee': '截肢',
        'anaglyph': '红蓝3D',
        'anal': '爆肛',
        'anal birth': '肛门出产',
        'anal intercourse': '肛交',
        'anal prolapse': '脱肛',
        'analphagia': '肛门吞食',
        'angel': '天使',
        'animal on animal': '兽兽',
        'animal on furry': '兽毛',
        'animated': '动图',
        'animegao': '头壳',
        'anorexic': '瘦骨嶙峋',
        'anthology': '选集',
        'apparel bukkake': '穿衣颜射',
        'apron': '围裙',
        'arabic': '阿拉伯语',
        'aramaic': '阿拉姆语',
        'armenian': '亚美尼亚语',
        'armpit licking': '腋下舔',
        'armpit sex': '腋交',
        'artbook': '画集',
        'artistcg': '画师CG',
        'asphyxiation': '窒息',
        'ass expansion': '臀部膨胀',
        'assjob': '尻交',
        'aunt': '阿姨',
        'autofellatio': '自吹',
        'autopaizuri': '自乳交',
        'bald': '秃顶',
        'ball caressing': '揉蛋',
        'ball sucking': '吸球',
        'balljob': '球交',
        'ball-less shemale': '无蛋人妖',
        'balls expansion': '睾丸生长',
        'bandages': '绷带',
        'bandaid': '创可贴',
        'bat boy': '蝙蝠男',
        'bat girl': '蝙蝠娘',
        'bathing room': '浴室',
        'bbm': '胖男人',
        'bbw': '胖女人',
        'bdsm': '调教',
        'beach': '沙滩',
        'bear': '熊',
        'bear boy': '狗熊男',
        'bear girl': '狗熊娘',
        'beauty mark': '美人痣',
        'bee boy': '蜂男',
        'bee girl': '蜂女',
        'bengali': '孟加拉语',
        'bestiality': '兽交',
        'big areolae': '大乳晕',
        'big ass': '大屁股',
        'big balls': '大睾丸',
        'big breasts': '巨乳',
        'big clit': '大阴蒂',
        'big lips': '大嘴唇',
        'big muscles': '大肌肉',
        'big nipples': '大乳头',
        'big penis': '大根',
        'big vagina': '大阴道',
        'bike shorts': '自行车短裤',
        'bikini': '比基尼',
        'bird boy': '鸟男',
        'bird girl': '鸟娘',
        'bisexual': '双性恋',
        'bite mark': '咬痕',
        'blackmail': '要挟',
        'blind': '失明',
        'blindfold': '遮眼布',
        'blood': '血液',
        'bloomers': '布鲁马',
        'blowjob': '口交',
        'blowjob face': '口交颜',
        'body modification': '身体改造',
        'body painting': '身体绘画',
        'body swap': '换身',
        'body writing': '身体写作',
        'bodystocking': '连身袜',
        'bodysuit': '紧身衣裤',
        'bondage': '束缚',
        'bosnian': '波斯尼亚语',
        'braces': '牙套',
        'brain fuck': '脑交',
        'breast expansion': '乳房膨胀',
        'breast feeding': '哺乳',
        'breast reduction': '乳房缩小',
        'bride': '婚纱',
        'brother': '兄弟',
        'bukkake': '颜射',
        'bulgarian': '保加利亚语',
        'bull': '牛',
        'bunny boy': '兔子男孩',
        'bunny girl': '兔女郎',
        'burmese': '缅甸语',
        'burping': '打嗝',
        'business suit': '西装',
        'butler': '管家',
        'butt plug': '肛塞',
        'camel': '骆驼',
        'cannibalism': '食人',
        'caption': '说明文字',
        'cashier': '收银员',
        'cat': '猫',
        'catalan': '加泰罗尼亚语',
        'catboy': '猫男',
        'catfight': '猫斗',
        'catgirl': '猫女',
        'cbt': '虐屌',
        'cebuano': '宿务语',
        'centaur': '半人马',
        'cervix penetration': '宫颈穿透',
        'cervix prolapse': '宫颈脱垂',
        'chastity belt': '贞操带',
        'cheating': '出轨',
        'cheerleader': '啦啦队员',
        'chikan': '痴汉',
        'chinese': '汉语',
        'chinese dress': '旗袍',
        'chloroform': '迷药',
        'christmas': '圣诞装',
        'clamp': '夹具',
        'classroom': '教室',
        'clit growth': '阴蒂生长',
        'clit insertion': '阴蒂插入',
        'clit stimulation': '阴蒂刺激',
        'cloaca insertion': '泄殖腔插入',
        'clone': '克隆',
        'closed eyes': '闭眼',
        'clothed female nude male': '裸男',
        'clothed male nude female': '裸女',
        'clothed paizuri': '穿衣乳交',
        'clown': '小丑',
        'coach': '教练',
        'cock ring': '锁精环',
        'cockphagia': '阴茎吞食',
        'cockslapping': '屌掴',
        'collar': '项圈',
        'comic': '西方漫画',
        'compilation': '汇编',
        'condom': '避孕套',
        'confinement': '监禁',
        'conjoined': '连体',
        'coprophagia': '食粪',
        'corpse': '尸体',
        'corruption': '堕落',
        'corset': '紧身胸衣',
        'cosplaying': 'Cosplay',
        'cousin': '表姐妹',
        'cow': '牛',
        'cowgirl': '牛女孩',
        'cowman': '牛男',
        'crab': '螃蟹',
        'cree': '克里语',
        'creole': '克里奥尔语',
        'croatian': '克罗地亚语',
        'crossdressing': '异性装',
        'crotch tattoo': '淫纹',
        'crown': '王冠',
        'crying': '流泪',
        'cum bath': '精液浴',
        'cum in eye': '眼射',
        'cum in eye': '眼射',
        'cum swap': '交换精液',
        'cumflation': '精液膨胀',
        'cunnilingus': '舔阴',
        'cuntboy': '人妖',
        'cuntbusting': '阴道破坏',
        'cuntbusting': '阴道破坏',
        'czech': '捷克语',
        'dakimakura': '抱枕',
        'danish': '丹麦语',
        'dark nipples': '暗色乳头',
        'dark sclera': '深色巩膜',
        'dark skin': '黑皮',
        'daughter': '女儿',
        'deepthroat': '深喉',
        'deer': '鹿',
        'deer boy': '鹿男孩',
        'deer girl': '鹿女孩',
        'defaced': '污损',
        'defloration': '破处',
        'demon': '恶魔',
        'demon girl': '恶魔女孩',
        'denki anma': '电气按摩',
        'depth grading': '深度分级',
        'detached sleeves': '分离袖子',
        'diaper': '尿布',
        'dickgirl on dickgirl': '鸡鸡复鸡鸡',
        'dickgirl on dickgirl': '扶上扶',
        'dickgirl on female': '扶上女',
        'dickgirl on male': '扶上男',
        'dickgirls only': '纯扶她',
        'dicknipples': '阴茎乳头',
        'dilf': '熟男',
        'dinosaur': '恐龙',
        'dismantling': '拆解',
        'dog': '狗',
        'dog boy': '狗男孩',
        'dog girl': '狗女孩',
        'doll joints': '关节娃娃',
        'dolphin': '海豚',
        'domination loss': '统治丢失',
        'donkey': '驴',
        'double anal': '双插肛门',
        'double blowjob': '一口二鸟',
        'double penetration': '双重插入',
        'double vaginal': '双插阴道',
        'dougi': '练功服',
        'draenei': '德莱尼',
        'dragon': '龙',
        'drill hair': '螺旋辫',
        'drugs': '药物',
        'drunk': '醉酒',
        'dutch': '荷兰语',
        'ear fuck': '耳交',
        'eel': '鳗鱼',
        'eggs': '产卵',
        'electric shocks': '电击',
        'elephant': '象',
        'elephant boy': '象男孩',
        'elephant girl': '象女孩',
        'elf': '精灵',
        'emotionless sex': '性冷淡',
        'enema': '灌肠',
        'english': '英语',
        'esperanto': '世界语',
        'estonian': '爱沙尼亚语',
        'exhibitionism': '露阴癖',
        'exposed clothing': '开洞装',
        'extraneous ads': '外部广告',
        'eye penetration': '插入眼睛',
        'eye-covering bang': '长刘海',
        'eyemask': '眼部面具',
        'eyepatch': '眼罩',
        'facesitting': '坐脸',
        'facial hair': '胡子',
        'fairy': '妖精',
        'fanny packing': '人肉腰包',
        'farting': '放屁',
        'father': '父亲',
        'females only': '纯女性',
        'femdom': '女性主导',
        'feminization': '女性化',
        'fff threesome': '女3P',
        'ffm threesome': '女男女3P',
        'fft threesome': '女扶女3P',
        'figure': '手办',
        'filming': '摄像',
        'fingering': '指法',
        'finnish': '芬兰语',
        'first person perspective': '第一人称视角',
        'fish': '鱼',
        'fishnets': '渔网',
        'fisting': '拳交',
        'focus anal': '高比例肛交',
        'focus blowjob': '高比例口交',
        'focus cunnilingus': '高比例舔阴',
        'focus handjob': '高比例手交',
        'focus paizuri': '高比例乳交',
        'focus rimjob': '高比例舔肛',
        'foot insertion': '足插入',
        'foot licking': '舔足',
        'footjob': '足交',
        'forbidden content': '禁止内容',
        'forced exposure': '强制暴露',
        'forniphilia': '人体家具',
        'fox': '狐狸',
        'fox boy': '狐男',
        'fox girl': '狐女',
        'freckles': '雀斑',
        'french': '法语',
        'frog': '青蛙',
        'frog boy': '青蛙男孩',
        'frog girl': '青蛙女孩',
        'frottage': '阴茎摩擦',
        'full censorship': '完全修正',
        'full color': '全彩',
        'full tour': '消化道游览',
        'full-packaged futanari': '有蛋扶她',
        'fundoshi': '六尺褌',
        'furry': '毛茸茸',
        'futanari': '扶她',
        'futanarization': '扶她化',
        'gag': '口塞',
        'gang rape': '轮奸',
        'gaping': '敞口',
        'garter belt': '吊袜带',
        'gasmask': '防毒面具',
        'gender change': '性转换',
        'genital piercing': '性器穿孔',
        'georgian': '格鲁吉亚语',
        'german': '德语',
        'ghost': '幽灵',
        'giant': '巨人',
        'giant sperm': '巨大精子',
        'giantess': '女巨人',
        'gigantic breasts': '极乳',
        'gijinka': '拟人化',
        'giraffe boy': '长颈鹿男',
        'giraffe girl': '长颈鹿娘',
        'glasses': '眼镜',
        'glory hole': '寻欢洞',
        'gloves': '手套',
        'goat': '山羊',
        'goblin': '哥布林',
        'gokkun': '饮精',
        'gorilla': '猩猩',
        'gothic lolita': '哥特萝莉装',
        'goudoushi': '合作本',
        'granddaughter': '孙女',
        'grandfather': '祖父',
        'grandmother': '祖母',
        'greek': '希腊语',
        'group': '乱交',
        'growth': '巨大化',
        'gujarati': '古吉拉特语',
        'guro': '猎奇',
        'gyaru': '辣妹',
        'gyaru-oh': '黄毛',
        'gymshorts': '运动短裤',
        'haigure': '高叉装',
        'hair buns': '丸子头',
        'hairjob': '发丝交',
        'hairy': '多毛',
        'hairy armpits': '腋毛',
        'halo': '光环',
        'handicapped': '残疾',
        'handjob': '手交',
        'hanging': '绞刑',
        'hardcore': '硬核',
        'harem': '后宫',
        'harness': '挽具',
        'harpy': '鸟人',
        'headless': '无头',
        'headphones': '头戴式耳机',
        'hebrew': '希伯来语',
        'hedgehog boy': '刺猬男',
        'hedgehog girl': '刺猬娘',
        'heterochromia': '异色瞳',
        'hidden sex': '隐蔽性交',
        'hidden toy': '隐蔽玩具',
        'high heels': '高跟鞋',
        'hijab': '头巾',
        'hindi': '印地语',
        'hippo boy': 'hippo boy',
        'hippo girl': 'hippo girl',
        'hmong': '苗语',
        'hood': '帽兜',
        'horns': '角',
        'horse': '马',
        'horse boy': '马男孩',
        'horse cock': '马根',
        'horse girl': '马女孩',
        'hotpants': '热裤',
        'how to': '教程',
        'huge breasts': '超乳',
        'huge penis': '巨根',
        'human cattle': '人类饲养',
        'human on furry': '人毛',
        'humiliation': '屈辱',
        'hungarian': '匈牙利语',
        'hyena boy': '鬣狗男孩',
        'hyena girl': '鬣狗女孩',
        'icelandic': '冰岛语',
        'impregnation': '受孕',
        'incest': '乱伦',
        'incomplete': '缺页',
        'indonesian': '印尼语',
        'infantilism': '幼稚型',
        'infirmary': '保健室',
        'inflation': '腹部膨胀',
        'insect': '昆虫',
        'insect boy': '昆虫男孩',
        'insect girl': '昆虫女孩',
        'inseki': '姻亲',
        'internal urination': '内部排尿',
        'inverted nipples': '乳头内陷',
        'invisible': '透明',
        'irish': '爱尔兰语',
        'italian': '意大利语',
        'japanese': '日语',
        'javanese': '爪哇語',
        'josou seme': '女装攻',
        'kangaroo': '袋鼠',
        'kangaroo boy': '袋鼠男孩',
        'kangaroo girl': '袋鼠女孩',
        'kannada': '卡纳达语',
        'kappa': '河童',
        'kazakh': '哈萨克语',
        'kemonomimi': '兽耳',
        'khmer': '高棉语',
        'kigurumi pajama': '动物连体睡衣',
        'kimono': '和服',
        'kindergarten uniform': '幼儿园制服',
        'kissing': '接吻',
        'kneepit sex': '膝下性交',
        'kodomo doushi': '两小无猜',
        'kodomo only': '仅儿童',
        'korean': '韩语',
        'kunoichi': '女忍装',
        'kurdish': '库尔德语',
        'lab coat': '白大褂',
        'lactation': '哺乳',
        'lactation': '母乳',
        'ladino': '犹太西班牙语',
        'lao': '老挝语',
        'large insertions': '大玩具',
        'large tattoo': '全身纹身',
        'latex': '乳胶紧身衣',
        'latin': '拉丁语',
        'latvian': '拉脱维亚语',
        'layer cake': '夹心蛋糕',
        'leash': '狗链',
        'leg lock': '勾腿',
        'legjob': '腿交',
        'leotard': '紧身衣',
        'lingerie': '情趣内衣',
        'lion': '狮',
        'lioness': '狮',
        'lipstick mark': '口红印',
        'living clothes': '生物衣',
        'lizard girl': '蜥蜴女孩',
        'lizard guy': '蜥蜴男孩',
        'lolicon': '萝莉',
        'long tongue': '长舌',
        'low bestiality': '低比例兽交',
        'low guro': '低比例猎奇',
        'low incest': '低比例乱伦',
        'low lolicon': '低比例萝莉',
        'low scat': '低比例排便',
        'low shotacon': '低比例正太',
        'low smegma': '低比例阴垢',
        'machine': '机械奸',
        'maggot': '蛆',
        'magical girl': '魔法少女',
        'maid': '女仆装',
        'makeup': '化妆',
        'male on dickgirl': '男上扶',
        'males only': '纯男性',
        'marathi': '马拉地语',
        'masked face': '假面',
        'masturbation': '自慰',
        'mecha boy': '机男',
        'mecha girl': '机娘',
        'menstruation': '经血',
        'mermaid': '美人鱼',
        'merman': '人鱼',
        'mesugaki': '雌小鬼',
        'mesuiki': '干高潮',
        'metal armor': '金属盔甲',
        'midget': '侏儒',
        'miko': '巫女装',
        'milf': '熟女',
        'military': '军装',
        'milking': '挤奶',
        'mind break': '洗脑',
        'mind control': '催眠',
        'minigirl': '迷你女孩',
        'miniguy': '迷你男孩',
        'minotaur': '牛头人',
        'missing cover': '缺封面',
        'mmf threesome': '男女男3P',
        'mmm threesome': '男3P',
        'mmt threesome': '男扶男3P',
        'mongolian': '蒙古语',
        'monkey': '猴',
        'monkey boy': '猴男孩',
        'monkey girl': '猴女孩',
        'monoeye': '独眼',
        'monster': '怪物',
        'monster girl': '魔物娘',
        'moral degeneration': '道德退化',
        'mosaic censorship': '马赛克修正',
        'moth boy': '蛾男',
        'moth girl': '蛾娘',
        'mother': '母亲',
        'mouse': '鼠',
        'mouse boy': '鼠男孩',
        'mouse girl': '鼠女孩',
        'mouth mask': '口罩',
        'mtf threesome': '男扶女3P',
        'multimouth blowjob': '多口口交',
        'multipanel sequence': '多格序列',
        'multiple arms': '多臂',
        'multiple assjob': '多重尻交',
        'multiple breasts': '多乳房',
        'multiple footjob': '多重足交',
        'multiple handjob': '多重手交',
        'multiple nipples': '多乳头',
        'multiple nipples': '多乳头',
        'multiple orgasms': '连续高潮',
        'multiple pairings': '多对多',
        'multiple paizuri': '多重乳交',
        'multiple penises': '鸡鸡复鸡鸡',
        'multiple straddling': '多人跨骑',
        'multiple tails': '多尾',
        'multiple vaginas': '多阴道',
        'multi-work series': '系列作品',
        'muscle': '肌肉',
        'muscle growth': '肌肉成长',
        'mushroom boy': '蘑菇男',
        'mushroom girl': '蘑菇女孩',
        'mute': '哑巴',
        'nakadashi': '中出',
        'navel birth': '肚脐出产',
        'navel fuck': '肚脐奸',
        'nazi': '纳粹军装',
        'ndebele': '恩德贝莱语',
        'necrophilia': '奸尸',
        'nepali': '尼泊尔语',
        'netorare': 'NTR',
        'netorase': '送妻',
        'niece': '侄女',
        'ninja': '忍者装',
        'nipple birth': '乳头出产',
        'nipple expansion': '乳头膨胀',
        'nipple fuck': '乳穴性交',
        'nipple piercing': '乳头穿孔',
        'nipple stimulation': '乳头刺激',
        'no balls': '无蛋',
        'no penetration': '无插入',
        'non-h': '无H',
        'non-h game manual': '无H游戏手册',
        'non-h imageset': '无H图片集',
        'non-nude': '无露点',
        'norwegian': '挪威语',
        'nose fuck': '鼻交',
        'nose hook': '鼻吊钩',
        'novel': '小说',
        'nudism': '裸体主义',
        'nudity only': '仅裸体',
        'nun': '修女服',
        'nurse': '护士装',
        'object insertion only': '仅物体插入',
        'octopus': '章鱼',
        'oil': '油',
        'old lady': '老女人',
        'old man': '老人',
        'omorashi': '漏尿',
        'onahole': '飞机杯',
        'oni': '鬼',
        'onsen': '温泉',
        'oppai loli': '巨乳萝莉',
        'orc': '半兽人',
        'orgasm denial': '高潮禁止',
        'original': '原创',
        'oromo': '奥罗莫语',
        'ostrich': '鸵鸟',
        'otokofutanari': '扶他',
        'otter boy': '水獭男孩',
        'otter girl': '水獭女孩',
        'out of order': '顺序错乱',
        'oyakodon': '母女丼',
        'painted nails': '美甲',
        'paizuri': '乳交',
        'panda boy': '熊猫男',
        'panda girl': '熊猫娘',
        'panther': '豹',
        'pantyhose': '连裤袜',
        'pantyjob': '内裤交',
        'paperchild': '纸片人',
        'papiamento': '帕皮阿门托语',
        'parasite': '寄生',
        'pashto': '普什图语',
        'pasties': '乳贴',
        'pegasus': '天马',
        'pegging': '爆菊',
        'penis birth': '阴茎出产',
        'penis bumps': '阴茎凸起',
        'penis enlargement': '阴茎生长',
        'penis reduction': '阴茎缩小',
        'persian': '波斯语',
        'personality excretion': '人格排泄',
        'petplay': '人宠',
        'petrification': '石化',
        'phimosis': '包茎',
        'phone sex': '电话性爱',
        'piercing': '穿孔',
        'pig': '猪',
        'pig girl': '猪女',
        'pig man': '猪男',
        'pillory': '枷具',
        'pirate': '海盗服',
        'piss drinking': '饮尿',
        'pixel art': '像素画',
        'pixie cut': '精灵头',
        'plant boy': '植物男孩',
        'plant girl': '植物女孩',
        'pole dancing': '钢管舞',
        'policeman': '警服',
        'policewoman': '警服',
        'polish': '波兰语',
        'ponygirl': '小马女',
        'ponygirl': '小马女',
        'ponytail': '马尾辫',
        'portuguese': '葡萄牙语',
        'possession': '附身',
        'pregnant': '怀孕',
        'prehensile hair': '抓握发',
        'priest': '牧师服',
        'prolapse': '脱垂',
        'property tag': '财产标签',
        'prostate massage': '前列腺按摩',
        'prostitution': '卖淫',
        'pubic stubble': '阴毛茬',
        'public use': '肉便器',
        'punjabi': '旁遮普语',
        'pussyboys only': '纯扶他',
        'rabbit': '兔',
        'raccoon boy': '浣熊男孩',
        'raccoon girl': '浣熊女孩',
        'race queen': '赛车女郎',
        'randoseru': '书包',
        'rape': '强奸',
        'real doll': '充气娃娃',
        'realporn': '真人色情',
        'redraw': '重绘',
        'replaced': '已替换',
        'reptile': '爬虫',
        'retractable penis': '可伸缩阴茎',
        'rewrite': '改写',
        'rhinoceros': '犀牛',
        'rhinoceros boy': '犀牛男孩',
        'rhinoceros girl': '犀牛女孩',
        'rimjob': '舔肛',
        'robot': '机器人',
        'romanian': '罗马尼亚语',
        'rough grammar': '语法差',
        'rough translation': '渣翻',
        'ruined orgasm': '高潮泡汤',
        'russian': '俄语',
        'ryona': '凌虐',
        'saliva': '唾液',
        'sample': '样本',
        'sango': '桑戈语',
        'sanskrit': '梵语',
        'sarashi': '缠胸布',
        'sauna': '桑拿',
        'scanmark': '扫描水印',
        'scar': '瘢痕',
        'scat': '粪便',
        'scat insertion': '粪便插入',
        'school gym uniform': '学校体操服',
        'school swimsuit': '死库水',
        'schoolboy uniform': '男生制服',
        'schoolgirl uniform': '女生制服',
        'screenshots': '截图',
        'scrotal lingerie': '阴囊袋',
        'selfcest': '自交',
        'sentou': '浴场',
        'serbian': '塞尔维亚语',
        'sex toys': '性玩具',
        'shapening': '平面化',
        'shared senses': '感官共享',
        'shark': '鲨',
        'shark boy': '鲨男孩',
        'shark girl': '鲨女孩',
        'shaved head': '光头',
        'sheep': '绵羊',
        'sheep boy': '羊男孩',
        'sheep girl': '羊女孩',
        'shemale': '人妖',
        'shibari': '捆绑',
        'shimaidon': '姐妹丼',
        'shimapan': '条纹胖次',
        'shona': '绍纳语',
        'shotacon': '正太',
        'shrinking': '缩小',
        'sister': '姐妹',
        'skeleton': '骷髅',
        'sketch lines': '线稿',
        'skinsuit': '人皮衣',
        'skunk boy': '臭鼬男',
        'skunk girl': '臭鼬娘',
        'slave': '奴隶',
        'sleeping': '睡觉',
        'slime': '史莱姆',
        'slime boy': '史莱姆男孩',
        'slime girl': '史莱姆女孩',
        'slovak': '斯洛伐克语',
        'slovenian': '斯洛文尼亚语',
        'slug': '蛞蝓',
        'small breasts': '贫乳',
        'small penis': '小小鸟',
        'smalldom': '逆体格差',
        'smegma': '阴垢',
        'smell': '气味',
        'smoking': '吸烟',
        'snail girl': '蜗牛女孩',
        'snake': '蛇',
        'snake boy': '蛇男',
        'snake girl': '蛇女',
        'snuff': '杀害',
        'sockjob': '袜交',
        'sole dickgirl': '单扶她',
        'sole female': '单女主',
        'sole male': '单男主',
        'sole pussyboy': '单扶他',
        'solo action': '自摸',
        'somali': '索马里语',
        'soushuuhen': '总集篇',
        'spanish': '西班牙语',
        'spanking': '打屁股',
        'speculum': '扩张器',
        'spider': '蜘蛛',
        'spider boy': '蜘蛛男',
        'spider girl': '蜘蛛娘',
        'split tongue': '分叉舌',
        'squid boy': '乌贼男',
        'squid girl': '乌贼娘',
        'squirrel boy': '松鼠男',
        'squirrel girl': '松鼠娘',
        'squirting': '潮吹',
        'ssbbm': '超级胖男人',
        'ssbbw': '超级胖女人',
        'stereoscopic': '立体图',
        'steward': '男空乘服',
        'stewardess': '空姐服',
        'stirrup legwear': '长筒袜',
        'stirrup legwear': '踩脚',
        'stockings': '长筒袜',
        'stomach deformation': '腹部变形',
        'story arc': '故事线',
        'straitjacket': '拘束衣',
        'strap-on': '穿戴式阳具',
        'stretching': '拉伸',
        'stuck in wall': '卡在墙上',
        'sumata': '股间性交',
        'sundress': '夏季连衣裙',
        'sunglasses': '太阳镜',
        'suspended': '悬空',
        'swahili': '斯瓦希里语',
        'sweating': '出汗',
        'swedish': '瑞典语',
        'swimming pool': '泳池',
        'swimsuit': '泳装',
        'swinging': '换妻',
        'syringe': '注射器',
        'tabi socks': '足袋',
        'table masturbation': '桌角自慰',
        'tagalog': '他加禄语',
        'tail': '尾巴',
        'tail plug': '尾塞',
        'tailjob': '尾交',
        'tailphagia': '尾巴吞食',
        'tall girl': '高个女',
        'tall man': '高个男',
        'tamil': '泰米尔语',
        'tankoubon': '单行本',
        'tanlines': '晒痕',
        'teacher': '教师',
        'telugu': '泰卢固语',
        'tentacles': '触手',
        'text cleaned': '文字清除',
        'textless narrative': '无文字叙事',
        'thai': '泰语',
        'themeless': '无主题',
        'thick eyebrows': '浓眉',
        'thigh high boots': '高筒靴',
        'tiara': '宝冠',
        'tibetan': '藏语',
        'tickling': '挠痒',
        'tiger': '虎',
        'tights': '厚连裤袜',
        'tigrinya': '提格雷尼亚语',
        'time stop': '时间停止',
        'toddlercon': '幼女',
        'tomboy': '假小子',
        'tomgirl': '伪娘',
        'tooth brushing': '刷牙',
        'torture': '拷打',
        'tracksuit': '运动服',
        'trampling': '践踏',
        'transformation': '变身',
        'translated': '翻译',
        'transparent clothing': '透明服装',
        'tribadism': '贝合',
        'triple anal': '三插肛门',
        'triple penetration': '三重插入',
        'triple vaginal': '三插阴道',
        'ttf threesome': '扶女扶3P',
        'ttm threesome': '扶扶男3P',
        'ttt threesome': '扶3P',
        'tube': '插管',
        'turkish': '土耳其语',
        'turtle': '龟',
        'tutor': '家庭教师',
        'twins': '双胞胎',
        'twintails': '双马尾',
        'ukrainian': '乌克兰语',
        'unbirth': '入阴',
        'uncensored': '无修正',
        'uncle': '叔叔',
        'underwater sex': '水下',
        'unicorn': '独角兽',
        'unusual insertions': '异物插入',
        'unusual pupils': '异瞳',
        'unusual teeth': '异齿',
        'urdu': '乌尔都语',
        'urethra insertion': '尿道插入',
        'urination': '排尿',
        'vacbed': '真空床',
        'vaginal birth': '阴道出产',
        'vaginal sticker': '阴贴',
        'vampire': '吸血鬼',
        'variant set': '变体集',
        'various': '多作品',
        'very long hair': '超长发',
        'vietnamese': '越南语',
        'virginity': '丧失童贞',
        'vomit': '呕吐',
        'vore': '吞食',
        'voyeurism': '偷窥',
        'vtuber': '虚拟主播',
        'waiter': '男侍者装',
        'waitress': '女侍者装',
        'watermarked': '水印',
        'webtoon': '条漫',
        'weight gain': '体重增加',
        'welsh': '威尔士语',
        'western': '西方',
        'western cg': '西方CG',
        'western imageset': '西方图集',
        'western non-h': '西方无H',
        'wet clothes': '湿身',
        'whale': '鲸',
        'whip': '鞭打',
        'widow': '寡妇',
        'widower': '鳏夫',
        'wingjob': '翼交',
        'wings': '翅膀',
        'witch': '女巫装',
        'wolf': '狼',
        'wolf boy': '狼男孩',
        'wolf girl': '狼女孩',
        'wooden horse': '木马',
        'worm': '蠕虫',
        'wormhole': '虫洞',
        'wrestling': '摔角',
        'x-ray': '透视',
        'yandere': '病娇',
        'yaoi': '男同',
        'yiddish': '意第绪语',
        'yukkuri': '油库里',
        'yuri': '百合',
        'zebra': '斑马',
        'zombie': '丧尸',
        'zulu': '祖鲁语'
    };

    // 🆕 条件翻译（根据分类不同翻译）
    const contextualTranslations = {
        'gender morph': {
            'male': '女体化',
            'female': '男体化'
        },
        'food on body': {
            'male': '男体盛宴',
            'female': '女体盛宴'
        }
    };

    // 从 Tampermonkey 存储获取自定义翻译
    function getCustomTranslations() {
        const stored = GM_getValue('customTagTranslations', '{}');
        try {
            return JSON.parse(stored);
        } catch (e) {
            return {};
        }
    }

    // 保存自定义翻译
    function saveCustomTranslations(translations) {
        GM_setValue('customTagTranslations', JSON.stringify(translations, null, 2));
    }

    // 清除所有自定义翻译
    function clearAllTranslations() {
        const confirmed = confirm('⚠️ 确定要清除所有导入的翻译吗？此操作无法撤销。');
        if (!confirmed) return;

        GM_deleteValue('customTagTranslations');
        alert('✓ 已清除所有自定义翻译数据');
    }

    // 合并翻译
    // 修改：添加分类参数
    function getTranslation(tag, category = null) {
        const customTranslations = getCustomTranslations();
        const normalizedTag = tag.toLowerCase().trim().replace(/_/g, ' ');

        // 🆕 检查条件翻译
        if (category && contextualTranslations[normalizedTag]) {
            const contextual = contextualTranslations[normalizedTag];
            if (contextual[category]) {
                return contextual[category];
            }
        }

        return customTranslations[normalizedTag] || tagTranslations[normalizedTag] || tag;
    }


    // 提取标签（修复版本）
    function extractTags() {
        const tagElements = document.querySelectorAll('a[id^="ta_"]');
        const tagsByCategory = {};

        tagElements.forEach(el => {
            // 获取完整的标签信息
            const id = el.getAttribute('id') || ''; const fullTag = id.replace(/^ta_/, '');

            // 解析格式：category:tag_name（例如：female:big ass）
            const parts = fullTag.split(':');
            let category = 'misc';
            let tag = fullTag;

            if (parts.length >= 2) {
                category = parts[0].trim().toLowerCase();
                tag = parts.slice(1).join(':').trim();  // 处理标签名中可能包含冒号的情况
            }

            // 初始化分类
            if (!tagsByCategory[category]) {
                tagsByCategory[category] = [];
            }

            // 避免重复
            if (!tagsByCategory[category].includes(tag)) {
                tagsByCategory[category].push(tag);
            }
        });

        return tagsByCategory;
    }

    // 格式化输出
    function formatTags(tagsByCategory) {
        const output = [];

        // 按照定义的顺序处理分类
        categoryOrder.forEach(cat => {
            if (tagsByCategory[cat] && tagsByCategory[cat].length > 0) {
                const categoryName = categoryNames[cat] || cat;
                const tags = tagsByCategory[cat]
                    .map(tag => `#${getTranslation(tag, cat)}`)  // 🆕 传入分类参数
                    .join('，');
                output.push(`${categoryName}：${tags}`);
            }
        });

        // 处理其他分类
        Object.keys(tagsByCategory).forEach(cat => {
            if (!categoryOrder.includes(cat) && tagsByCategory[cat].length > 0) {
                const categoryName = categoryNames[cat] || cat;
                const tags = tagsByCategory[cat]
                    .map(tag => `#${getTranslation(tag, cat)}`)  // 🆕 传入分类参数
                    .join('，');
                output.push(`${categoryName}：${tags}`);
            }
        });

        return output.join('\n');
    }


    // 复制到剪贴板
    function copyToClipboard(text) {
        if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(text);
            alert('✓ 标签已复制到剪贴板');
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert('✓ 标签已复制到剪贴板');
            });
        }
    }

    // 导出翻译为 JSON 格式
    function exportTranslations() {
        const customTranslations = getCustomTranslations();
        const exportData = {
            timestamp: new Date().toLocaleString('zh-CN'),
            version: 'https://t.me/BGG_Comics',
            translations: customTranslations
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        copyToClipboard(jsonString);
        alert('✓ 翻译已导出到剪贴板（JSON 格式）\n\n' + jsonString);
    }

    // 导入翻译
    function importTranslations() {
        const input = prompt('请粘贴导入的翻译数据（JSON 格式）：');
        if (!input) return;

        try {
            const data = JSON.parse(input);
            const translations = data.translations || data;

            if (typeof translations !== 'object' || Array.isArray(translations)) {
                throw new Error('数据格式不正确');
            }

            const customTranslations = getCustomTranslations();
            const merged = { ...customTranslations, ...translations };

            saveCustomTranslations(merged);
            alert(`✓ 成功导入 ${Object.keys(translations).length} 条翻译`);
        } catch (e) {
            alert('✗ 导入失败：' + e.message + '\n\n请确保数据格式正确');
        }
    }

    // 新增翻译
    function addTranslation() {
        const input = prompt('输入格式：英文标签|中文翻译\n\n例如：big ass|大屁股');
        if (!input) return;

        const [english, chinese] = input.split('|').map(s => s.trim());
        if (!english || !chinese) {
            alert('✗ 格式错误，请按照 "英文|中文" 的格式输入');
            return;
        }

        const customTranslations = getCustomTranslations();
        customTranslations[english.toLowerCase()] = chinese;
        saveCustomTranslations(customTranslations);
        alert(`✓ 成功添加翻译：${english} → ${chinese}`);
    }

    // 创建浮动按钮面板
    function createFloatingButtons() {
        const container = document.createElement('div');
        container.id = 'tag-extractor-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        const buttons = [
            { text: '📋 复制标签', onClick: () => {
                const tags = extractTags();
                const formatted = formatTags(tags);
                copyToClipboard(formatted);
            }},
            { text: '➕ 新增翻译', onClick: addTranslation },
            { text: '📥 导出翻译', onClick: exportTranslations },
            { text: '📤 导入翻译', onClick: importTranslations },
            { text: '🗑️ 清除翻译', onClick: clearAllTranslations, danger: true }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.innerText = btn.text;
            const bgColor = btn.danger ? '#f44336' : '#4CAF50';
            const hoverColor = btn.danger ? '#da190b' : '#45a049';
            button.style.cssText = `
                padding: 10px 15px;
                background-color: ${bgColor};
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                transition: background-color 0.3s;
            `;
            button.onmouseover = () => button.style.backgroundColor = hoverColor;
            button.onmouseout = () => button.style.backgroundColor = bgColor;
            button.onclick = btn.onClick;
            container.appendChild(button);
        });

        document.body.appendChild(container);
    }

    // 延迟创建按钮，确保 DOM 加载完成
    setTimeout(createFloatingButtons, 500);
})();
