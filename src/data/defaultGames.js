export const WEDDING_AVATARS = [
  '🥂', '💍', '💐', '👰‍♀️', '🤵‍♂️', '💖', '🦢', '🍰', '🌹', '✨', '🎩', '👑'
];

export const THEME_OPTIONS = [
  { id: 'rose_gold', name: 'Rose Gold & Champagne (งานแต่งโรสโกลด์ยอดฮิต)', color: '#b85d6f' },
  { id: 'champagne_ivory', name: 'Ivory & Sage Garden (งานแต่งในสวนมินิมอล)', color: '#566b58' },
  { id: 'royal_navy', name: 'Royal Navy & Gold (งานแต่งโรงแรมหรู Luxury)', color: '#1e3a6e' },
  { id: 'seminar_slate', name: 'Modern Seminar & Corporate (งานสัมมนา/องค์กร)', color: '#175c7d' }
];

export const DEFAULT_GAMES = [
  {
    id: 'game-wedding-kahoot-01',
    title: 'แฟนพันธุ์แท้บ่าวสาว — รู้จักความรักของเรามากแค่ไหน?',
    subtitle: 'เกมตอบคำถามชิงความไวสไตล์ Kahoot สำหรับช่วงเปิดตัวหรือตัดเค้ก',
    event_type: 'wedding',
    game_mode: 'quiz',
    bingo_submode: 'quiz_grid',
    bingo_grid_size: 4,
    bingo_fill_mode: 'random_card',
    theme: 'rose_gold',
    couple_names: 'คุณพลอย & คุณนนท์',
    event_date: '2026-11-28',
    client_code: 'WED-PLOYNON-2026',
    package_name: 'แพ็กเกจนายพิธี VIP + เกมงานแต่ง',
    max_players: 200,
    play_count: 3,
    created_at: '2026-11-10T10:00:00Z',
    questions: [
      {
        id: 'q1',
        text: 'เจ้าบ่าวและเจ้าสาวเจอกันครั้งแรกที่ไหน?',
        timeLimit: 20,
        points: 1000,
        options: [
          'ร้านกาแฟแถวอารีย์',
          'งานแต่งเพื่อนสนิทมัธยม',
          'ทริปดำน้ำที่ภูเก็ต',
          'ออฟฟิศที่ทำงานเดียวกัน'
        ],
        correctIndex: 1
      },
      {
        id: 'q2',
        text: 'เดทแรกของทั้งคู่ ไปทานเมนูอะไรด้วยกัน?',
        timeLimit: 20,
        points: 1000,
        options: [
          'ชาบูหม่าล่าหม้อไฟ',
          'ส้มตำปูปลาร้าเผ็ดคูณสอง',
          'โอมากาเสะซูชิ',
          'หมูกระทะริมน้ำ'
        ],
        correctIndex: 3
      },
      {
        id: 'q3',
        text: 'ใครเป็นคนเอ่ยปากบอกรักก่อน และบอกที่ไหน?',
        timeLimit: 20,
        points: 1000,
        options: [
          'เจ้าบ่าวบอก บนชิงช้าสวรรค์เอเชียทีค',
          'เจ้าสาวบอก ตอนไปเที่ยวเชียงใหม่',
          'เจ้าบ่าวบอก ในรถตอนรถติดบนทางด่วน',
          'บอกพร้อมกันในคืนวันปีใหม่'
        ],
        correctIndex: 2
      },
      {
        id: 'q4',
        text: 'ทริปฮันนีมูนในฝันที่ทั้งคู่จองตั๋วไว้หลังแต่งงานคือประเทศอะไร?',
        timeLimit: 20,
        points: 1000,
        options: [
          'สวิตเซอร์แลนด์',
          'ญี่ปุ่น (ฮอกไกโด)',
          'อิตาลี',
          'นิวซีแลนด์'
        ],
        correctIndex: 1
      },
      {
        id: 'q5',
        text: 'คติประจำใจในการใช้ชีวิตคู่ของบ่าวสาวคู่นี้คือข้อใด?',
        timeLimit: 20,
        points: 1200,
        options: [
          'ภรรยาถูกเสมอ ข้อสองกลับไปดูข้อแรก',
          'โกรธกันห้ามเกินข้ามคืน',
          'เรื่องกินเรื่องใหญ่ เรื่องอื่นเรื่องเล็ก',
          'แบ่งงานบ้านคนละครึ่งอย่างยุติธรรม'
        ],
        correctIndex: 0
      }
    ],
    bingo_items: []
  },
  {
    id: 'game-wedding-quiz-bingo-02',
    title: 'Love Story Quiz Bingo — บิงโกตอบคำถามบ่าวสาว',
    subtitle: 'แขกตอบคำถามบ่าวสาวให้ถูกเพื่อสะสมช่องบิงโก (เลือกเรียงช่องหรือสุ่มการ์ดได้)',
    event_type: 'wedding',
    game_mode: 'bingo',
    bingo_submode: 'quiz_grid',
    bingo_grid_size: 3,
    bingo_fill_mode: 'random_card', // 'sequential' | 'random_card'
    theme: 'rose_gold',
    couple_names: 'คุณมายด์ & คุณเต้',
    event_date: '2026-12-05',
    client_code: 'BINGO-MINDTAE-88',
    package_name: 'ขายแยกเฉพาะระบบเกม (Standalone License)',
    max_players: 200,
    play_count: 2,
    created_at: '2026-11-12T14:30:00Z',
    questions: [
      {
        id: 'bq1',
        text: 'ระยะเวลาที่บ่าวสาวคบหากันก่อนเข้าพิธีวิวาห์กี่ปี?',
        timeLimit: 20,
        points: 500,
        bingoLabel: 'คบกัน 7 ปี',
        options: ['3 ปี', '5 ปี', '7 ปี', '9 ปี'],
        correctIndex: 2
      },
      {
        id: 'bq2',
        text: 'สัตว์เลี้ยงตัวโปรดของบ่าวสาวชื่อว่าอะไร?',
        timeLimit: 20,
        points: 500,
        bingoLabel: 'น้องถุงทอง',
        options: ['น้องมั่งมี', 'น้องถุงทอง', 'น้องกะทิ', 'น้องไข่ตุ๋น'],
        correctIndex: 1
      },
      {
        id: 'bq3',
        text: 'เดือนเกิดของเจ้าสาวคือเดือนอะไร?',
        timeLimit: 20,
        points: 500,
        bingoLabel: 'กุมภาพันธ์',
        options: ['กุมภาพันธ์', 'พฤษภาคม', 'สิงหาคม', 'พฤศจิกายน'],
        correctIndex: 0
      },
      {
        id: 'bq4',
        text: 'เครื่องดื่มที่เจ้าบ่าวต้องสั่งทุกเช้าคือเมนูใด?',
        timeLimit: 20,
        points: 500,
        bingoLabel: 'อเมริกาโน่ไม่หวาน',
        options: ['ชาไทยหวานน้อย', 'มัทฉะลาเต้', 'อเมริกาโน่ไม่หวาน', 'โกโก้ปั่น'],
        correctIndex: 2
      },
      {
        id: 'bq5',
        text: 'สถานที่ขอแต่งงานสุดโรแมนติกอยู่ที่ไหน?',
        timeLimit: 20,
        points: 500,
        bingoLabel: 'ริมทะเลหัวหิน',
        options: ['ริมทะเลหัวหิน', 'ยอดดอยอินทนนท์', 'ดิสนีย์แลนด์โตเกียว', 'ร้านอาหารรูฟท็อปกรุงเทพฯ'],
        correctIndex: 0
      },
      {
        id: 'bq6',
        text: 'งานอดิเรกที่บ่าวสาวชอบทำด้วยกันในวันหยุดคือ?',
        timeLimit: 20,
        points: 500,
        bingoLabel: 'แคมป์ปิ้งกางเต็นท์',
        options: ['ดูซีรีส์เกาหลีข้ามคืน', 'แคมป์ปิ้งกางเต็นท์', 'เข้าคลาสทำขนม', 'ปั่นจักรยานสวนรถไฟ'],
        correctIndex: 1
      },
      {
        id: 'bq7',
        text: 'สีธีมงานแต่งในวันนี้มีความหมายมาจากอะไร?',
        timeLimit: 20,
        points: 500,
        bingoLabel: 'สีดอกกุหลาบช่อแรก',
        options: ['สีดอกกุหลาบช่อแรก', 'สีมงคลตามวันเกิด', 'สีเสื้อที่ใส่เดทแรก', 'สีที่แม่เจ้าสาวเลือกให้'],
        correctIndex: 0
      },
      {
        id: 'bq8',
        text: 'ของขวัญชิ้นแรกที่เจ้าบ่าวซื้อให้เจ้าสาวคืออะไร?',
        timeLimit: 20,
        points: 500,
        bingoLabel: 'ตุ๊กตาหมีตัวใหญ่',
        options: ['น้ำหอมกลิ่นโปรด', 'กระเป๋าสตางค์', 'ตุ๊กตาหมีตัวใหญ่', 'สร้อยข้อมือเงิน'],
        correctIndex: 2
      },
      {
        id: 'bq9',
        text: 'บ่าวสาววางแผนอยากมีทายาทกี่คน?',
        timeLimit: 20,
        points: 500,
        bingoLabel: 'ลูกแฝด 2 คน',
        options: ['1 คน', 'ลูกแฝด 2 คน', '3 คน', 'เลี้ยงแมวไปก่อน'],
        correctIndex: 1
      }
    ],
    bingo_items: [
      'คบกัน 7 ปี',
      'น้องถุงทอง',
      'กุมภาพันธ์',
      'อเมริกาโน่ไม่หวาน',
      'ริมทะเลหัวหิน',
      'แคมป์ปิ้งกางเต็นท์',
      'สีดอกกุหลาบช่อแรก',
      'ตุ๊กตาหมีตัวใหญ่',
      'ลูกแฝด 2 คน'
    ]
  },
  {
    id: 'game-wedding-number-bingo-03',
    title: 'Lucky Wedding Number Bingo — บิงโกตัวเลขมงคล 1-25',
    subtitle: 'บิงโกตัวเลขคลาสสิก 5x5 หมุนวงล้อตัวเลขบนเวที แขกจิ้มเลขบนมือถือลุ้นรางวัลใหญ่',
    event_type: 'wedding',
    game_mode: 'bingo',
    bingo_submode: 'number_classic',
    bingo_grid_size: 5,
    bingo_fill_mode: 'random_card',
    theme: 'royal_navy',
    couple_names: 'คุณแพรว & คุณก้อง',
    event_date: '2026-12-14',
    client_code: 'LUCKY-PK-2026',
    package_name: 'แพ็กเกจนายพิธี VIP + เกมอาฟเตอร์ปาร์ตี้',
    max_players: 200,
    play_count: 4,
    created_at: '2026-11-14T09:15:00Z',
    questions: [],
    bingo_items: Array.from({ length: 25 }, (_, idx) => String(idx + 1))
  },
  {
    id: 'game-seminar-kahoot-04',
    title: 'Townhall & Seminar Ice-Breaking Quiz 2026',
    subtitle: 'เกมละลายพฤติกรรมและทดสอบความรู้ผู้เข้าอบรมสัมมนา รองรับ 200 ท่าน',
    event_type: 'seminar',
    game_mode: 'quiz',
    bingo_submode: 'quiz_grid',
    bingo_grid_size: 4,
    bingo_fill_mode: 'random_card',
    theme: 'seminar_slate',
    couple_names: 'บริษัท บลูเวดดิ้ง แอนด์ อีเวนต์ จำกัด',
    event_date: '2026-11-25',
    client_code: 'CORP-SEMINAR-01',
    package_name: 'แพ็กเกจพิธีกรงานสัมมนา + Interactive Quiz',
    max_players: 200,
    play_count: 2,
    created_at: '2026-11-15T11:00:00Z',
    questions: [
      {
        id: 'sq1',
        text: 'หัวใจสำคัญที่สุดของการสื่อสารในทีมยุค AI คือข้อใด?',
        timeLimit: 20,
        points: 1000,
        options: [
          'ความชัดเจนและการรับฟังอย่างตั้งใจ (Active Listening)',
          'การส่งอีเมลให้ยาวที่สุด',
          'การประชุมทุกชั่วโมง',
          'การใช้ศัพท์เทคนิคเยอะๆ'
        ],
        correctIndex: 0
      },
      {
        id: 'sq2',
        text: 'เป้าหมายหลักประจำปีขององค์กรเราในปีนี้เน้นเรื่องใดเป็นอันดับ 1?',
        timeLimit: 20,
        points: 1000,
        options: [
          'Customer Experience & Innovation',
          'ลดเวลาพักเบรกกาแฟ',
          'เพิ่มจำนวนเอกสารกระดาษ',
          'งดจัดงานเลี้ยงประจำปี'
        ],
        correctIndex: 0
      },
      {
        id: 'sq3',
        text: 'กิจกรรมช่วงบ่ายวันนี้จะแจกรางวัลใหญ่สุดคืออะไร?',
        timeLimit: 15,
        points: 1000,
        options: [
          'บัตรกำนัลดินเนอร์โรงแรม 5 ดาว',
          'ปากกาลูกลื่น 1 ด้าม',
          'สิทธิ์เข้างานเช้ากว่าเดิม',
          'สมุดโน้ตบริษัท'
        ],
        correctIndex: 0
      }
    ],
    bingo_items: []
  }
];

export const DEFAULT_HISTORY_SESSIONS = [
  {
    id: 'session-hist-01',
    pin: '882941',
    game_id: 'game-wedding-kahoot-01',
    game_title: 'แฟนพันธุ์แท้บ่าวสาว — รู้จักความรักของเรามากแค่ไหน?',
    game_mode: 'quiz',
    bingo_submode: 'quiz_grid',
    couple_names: 'คุณพลอย & คุณนนท์',
    event_type: 'wedding',
    status: 'finished',
    player_count: 186,
    started_at: '2026-11-16T19:15:00Z',
    ended_at: '2026-11-16T19:34:00Z',
    winner_summary: [
      { rank: 1, nickname: 'แก๊งเพื่อนเจ้าสาวโต๊ะ 4', avatar: '👰‍♀️', score: 4820, correct_count: 5 },
      { rank: 2, nickname: 'พี่บอย ญาติเจ้าบ่าว', avatar: '🥂', score: 4610, correct_count: 5 },
      { rank: 3, nickname: 'น้องมิ้นท์ มศว', avatar: '💐', score: 4390, correct_count: 4 }
    ]
  },
  {
    id: 'session-hist-02',
    pin: '549120',
    game_id: 'game-wedding-quiz-bingo-02',
    game_title: 'Love Story Quiz Bingo — บิงโกตอบคำถามบ่าวสาว',
    game_mode: 'bingo',
    bingo_submode: 'quiz_grid',
    couple_names: 'คุณมายด์ & คุณเต้',
    event_type: 'wedding',
    status: 'finished',
    player_count: 164,
    started_at: '2026-11-15T12:20:00Z',
    ended_at: '2026-11-15T12:42:00Z',
    winner_summary: [
      { rank: 1, nickname: 'คุณป้าสมศรี โต๊ะ VIP', avatar: '👑', score: 3500, correct_count: 7, is_bingo_winner: true },
      { rank: 2, nickname: 'เจนนี่ เพื่อนมัธยม', avatar: '💖', score: 3000, correct_count: 6, is_bingo_winner: true },
      { rank: 3, nickname: 'กัปตันต้น', avatar: '🎩', score: 2500, correct_count: 5, is_bingo_winner: false }
    ]
  },
  {
    id: 'session-hist-03',
    pin: '310492',
    game_id: 'game-seminar-kahoot-04',
    game_title: 'Townhall & Seminar Ice-Breaking Quiz 2026',
    game_mode: 'quiz',
    bingo_submode: 'quiz_grid',
    couple_names: 'บริษัท บลูเวดดิ้ง แอนด์ อีเวนต์ จำกัด',
    event_type: 'seminar',
    status: 'finished',
    player_count: 198,
    started_at: '2026-11-14T13:30:00Z',
    ended_at: '2026-11-14T13:50:00Z',
    winner_summary: [
      { rank: 1, nickname: 'คุณเอก ฝ่ายการตลาด', avatar: '✨', score: 2910, correct_count: 3 },
      { rank: 2, nickname: 'คุณแนน HR', avatar: '🥂', score: 2840, correct_count: 3 },
      { rank: 3, nickname: 'คุณท็อป IT', avatar: '🎩', score: 2720, correct_count: 3 }
    ]
  }
];
