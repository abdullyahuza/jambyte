const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(__dirname, 'jamb.db')

// Delete existing DB
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH)

const db = new Database(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    year INTEGER,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT
  )
`)

const questions = [
  // ===== ENGLISH LANGUAGE =====
  { subject: 'English Language', year: 2022, question: 'Choose the word that is nearest in meaning to the underlined word: The teacher gave an ELABORATE explanation of the topic.', options: ['A. Simple', 'B. Detailed', 'C. Boring', 'D. Short'], answer: 'B', explanation: 'Elaborate means detailed or complicated, developed in great detail.' },
  { subject: 'English Language', year: 2021, question: 'In which of the following sentences is the apostrophe used correctly?', options: ["A. The boys' books are here", "B. The boy's books' are here", "C. The boy's book's are here", "D. The boys book are here"], answer: 'A', explanation: '"The boys\' books" shows plural possessive — apostrophe after the plural noun boys.' },
  { subject: 'English Language', year: 2020, question: 'Choose the option that best completes the sentence: Neither the teacher nor the students _____ in the hall.', options: ['A. is', 'B. are', 'C. was', 'D. were'], answer: 'B', explanation: 'With "neither...nor", the verb agrees with the noun closest to it — "students" is plural, so "are" is correct.' },
  { subject: 'English Language', year: 2019, question: 'Identify the figure of speech in: "The wind whispered through the trees."', options: ['A. Simile', 'B. Metaphor', 'C. Personification', 'D. Hyperbole'], answer: 'C', explanation: 'Personification gives human qualities (whispering) to a non-human thing (the wind).' },
  { subject: 'English Language', year: 2022, question: 'Choose the option that has the same vowel sound as the underlined word: HEAT', options: ['A. Head', 'B. Heart', 'C. Seat', 'D. Heard'], answer: 'C', explanation: 'HEAT and SEAT share the /iː/ vowel sound.' },
  { subject: 'English Language', year: 2018, question: 'Which of the following is a concrete noun?', options: ['A. Beauty', 'B. Love', 'C. Table', 'D. Courage'], answer: 'C', explanation: 'A concrete noun refers to something you can physically touch or see. A table is a physical object.' },
  { subject: 'English Language', year: 2021, question: 'Choose the option that is opposite in meaning to VERBOSE.', options: ['A. Talkative', 'B. Concise', 'C. Wordy', 'D. Loquacious'], answer: 'B', explanation: 'Verbose means using more words than needed. The opposite is concise — brief and to the point.' },
  { subject: 'English Language', year: 2020, question: 'The plural form of "ox" is _____.', options: ['A. Oxes', 'B. Oxen', 'C. Oxs', 'D. Ox'], answer: 'B', explanation: 'Ox is an irregular noun. Its plural is oxen, not oxes.' },
  { subject: 'English Language', year: 2019, question: 'Which sentence is in the passive voice?', options: ['A. The boy kicked the ball', 'B. The ball was kicked by the boy', 'C. The boy kicks the ball', 'D. The boy will kick the ball'], answer: 'B', explanation: 'Passive voice: the subject (ball) receives the action. "The ball was kicked by the boy" is passive.' },
  { subject: 'English Language', year: 2023, question: 'Choose the correctly spelt word.', options: ['A. Accomodate', 'B. Accommodate', 'C. Acomodate', 'D. Acommodate'], answer: 'B', explanation: 'The correct spelling is "Accommodate" — double c and double m.' },

  // ===== MATHEMATICS =====
  { subject: 'Mathematics', year: 2022, question: 'Simplify: (2³ × 2⁴) ÷ 2⁵', options: ['A. 2', 'B. 4', 'C. 8', 'D. 16'], answer: 'B', explanation: '2³ × 2⁴ = 2⁷. Then 2⁷ ÷ 2⁵ = 2² = 4.' },
  { subject: 'Mathematics', year: 2021, question: 'If 2x + 3 = 11, find x.', options: ['A. 3', 'B. 4', 'C. 5', 'D. 7'], answer: 'B', explanation: '2x + 3 = 11 → 2x = 8 → x = 4.' },
  { subject: 'Mathematics', year: 2020, question: 'Find the area of a circle with radius 7cm. (Take π = 22/7)', options: ['A. 44 cm²', 'B. 154 cm²', 'C. 22 cm²', 'D. 308 cm²'], answer: 'B', explanation: 'Area = πr² = (22/7) × 7² = (22/7) × 49 = 22 × 7 = 154 cm².' },
  { subject: 'Mathematics', year: 2019, question: 'What is 15% of 200?', options: ['A. 15', 'B. 20', 'C. 30', 'D. 45'], answer: 'C', explanation: '15% of 200 = (15/100) × 200 = 30.' },
  { subject: 'Mathematics', year: 2022, question: 'Factorize: x² + 5x + 6', options: ['A. (x + 2)(x + 3)', 'B. (x + 1)(x + 6)', 'C. (x - 2)(x - 3)', 'D. (x + 2)(x - 3)'], answer: 'A', explanation: 'We need two numbers that multiply to 6 and add to 5: those are 2 and 3. So (x + 2)(x + 3).' },
  { subject: 'Mathematics', year: 2018, question: 'The sum of angles of a triangle is _____.', options: ['A. 90°', 'B. 180°', 'C. 270°', 'D. 360°'], answer: 'B', explanation: 'The interior angles of any triangle always sum to 180 degrees.' },
  { subject: 'Mathematics', year: 2021, question: 'Evaluate: log₁₀ 1000', options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'], answer: 'C', explanation: 'log₁₀ 1000 = log₁₀ 10³ = 3.' },
  { subject: 'Mathematics', year: 2023, question: 'A man walks 3km north, then 4km east. How far is he from his starting point?', options: ['A. 5 km', 'B. 6 km', 'C. 7 km', 'D. 8 km'], answer: 'A', explanation: 'By Pythagoras theorem: √(3² + 4²) = √(9 + 16) = √25 = 5 km.' },
  { subject: 'Mathematics', year: 2020, question: 'If the mean of 3, 5, 7, x is 6, find x.', options: ['A. 7', 'B. 8', 'C. 9', 'D. 10'], answer: 'C', explanation: '(3 + 5 + 7 + x)/4 = 6 → 15 + x = 24 → x = 9.' },
  { subject: 'Mathematics', year: 2019, question: 'Convert 0.625 to a fraction in its lowest terms.', options: ['A. 5/8', 'B. 3/4', 'C. 2/3', 'D. 7/8'], answer: 'A', explanation: '0.625 = 625/1000 = 5/8 (dividing by 125).' },

  // ===== PHYSICS =====
  { subject: 'Physics', year: 2022, question: 'What is the SI unit of force?', options: ['A. Joule', 'B. Pascal', 'C. Newton', 'D. Watt'], answer: 'C', explanation: 'The SI unit of force is the Newton (N), defined as kg·m/s².' },
  { subject: 'Physics', year: 2021, question: 'A body accelerates at 2 m/s² from rest. What is its velocity after 5 seconds?', options: ['A. 5 m/s', 'B. 7 m/s', 'C. 10 m/s', 'D. 15 m/s'], answer: 'C', explanation: 'v = u + at = 0 + (2 × 5) = 10 m/s.' },
  { subject: 'Physics', year: 2020, question: 'Which of the following is NOT a vector quantity?', options: ['A. Velocity', 'B. Acceleration', 'C. Speed', 'D. Force'], answer: 'C', explanation: 'Speed is a scalar quantity — it has magnitude only. Velocity, acceleration, and force are vectors (they have both magnitude and direction).' },
  { subject: 'Physics', year: 2019, question: 'What type of image is formed by a plane mirror?', options: ['A. Real, inverted', 'B. Virtual, erect', 'C. Real, erect', 'D. Virtual, inverted'], answer: 'B', explanation: 'A plane mirror forms a virtual, erect, and laterally inverted image of the same size as the object.' },
  { subject: 'Physics', year: 2022, question: 'The principle of conservation of energy states that energy can be _____.', options: ['A. Created but not destroyed', 'B. Destroyed but not created', 'C. Neither created nor destroyed', 'D. Both created and destroyed'], answer: 'C', explanation: 'The law of conservation of energy: energy can neither be created nor destroyed, only converted from one form to another.' },
  { subject: 'Physics', year: 2018, question: 'What is the frequency of a wave with period 0.02s?', options: ['A. 5 Hz', 'B. 20 Hz', 'C. 50 Hz', 'D. 200 Hz'], answer: 'C', explanation: 'f = 1/T = 1/0.02 = 50 Hz.' },
  { subject: 'Physics', year: 2021, question: "Ohm's law states that V = IR. If V = 12V and R = 4Ω, find I.", options: ['A. 1 A', 'B. 2 A', 'C. 3 A', 'D. 48 A'], answer: 'C', explanation: 'I = V/R = 12/4 = 3 A.' },
  { subject: 'Physics', year: 2023, question: 'Which type of wave requires a material medium for propagation?', options: ['A. Radio waves', 'B. X-rays', 'C. Sound waves', 'D. Light waves'], answer: 'C', explanation: 'Sound waves are mechanical waves and require a medium (solid, liquid, or gas) to travel. Electromagnetic waves (radio, X-rays, light) do not.' },
  { subject: 'Physics', year: 2020, question: 'What happens to the boiling point of water at high altitude?', options: ['A. Increases', 'B. Decreases', 'C. Remains the same', 'D. Becomes zero'], answer: 'B', explanation: 'At high altitudes, atmospheric pressure is lower. Lower pressure means water boils at a lower temperature.' },
  { subject: 'Physics', year: 2019, question: 'A car of mass 1000 kg is moving at 20 m/s. What is its kinetic energy?', options: ['A. 100 kJ', 'B. 200 kJ', 'C. 400 kJ', 'D. 20 kJ'], answer: 'B', explanation: 'KE = ½mv² = ½ × 1000 × 20² = 500 × 400 = 200,000 J = 200 kJ.' },

  // ===== CHEMISTRY =====
  { subject: 'Chemistry', year: 2022, question: 'What is the chemical symbol for Gold?', options: ['A. Go', 'B. Gd', 'C. Au', 'D. Ag'], answer: 'C', explanation: "Gold's symbol is Au, from the Latin word \"Aurum\"." },
  { subject: 'Chemistry', year: 2021, question: 'How many neutrons does Carbon-14 have?', options: ['A. 6', 'B. 7', 'C. 8', 'D. 14'], answer: 'C', explanation: 'Carbon has atomic number 6 (6 protons). Carbon-14 has mass number 14. Neutrons = 14 - 6 = 8.' },
  { subject: 'Chemistry', year: 2020, question: 'Which of the following is an example of a physical change?', options: ['A. Burning wood', 'B. Rusting of iron', 'C. Melting of ice', 'D. Cooking of food'], answer: 'C', explanation: 'Melting of ice is a physical change — only the state changes, the chemical composition remains H₂O.' },
  { subject: 'Chemistry', year: 2019, question: 'The pH of a neutral solution at 25°C is _____.', options: ['A. 0', 'B. 7', 'C. 10', 'D. 14'], answer: 'B', explanation: 'A neutral solution has pH 7. Below 7 is acidic; above 7 is alkaline.' },
  { subject: 'Chemistry', year: 2022, question: 'Which gas is produced when dilute HCl reacts with zinc?', options: ['A. Oxygen', 'B. Carbon dioxide', 'C. Hydrogen', 'D. Nitrogen'], answer: 'C', explanation: 'Zn + 2HCl → ZnCl₂ + H₂. Hydrogen gas is produced.' },
  { subject: 'Chemistry', year: 2018, question: 'What type of bond is found in NaCl?', options: ['A. Covalent bond', 'B. Metallic bond', 'C. Ionic bond', 'D. Hydrogen bond'], answer: 'C', explanation: 'NaCl (sodium chloride) is held together by ionic bonds — formed by the transfer of electrons between Na and Cl.' },
  { subject: 'Chemistry', year: 2021, question: 'Which of the following is NOT a noble gas?', options: ['A. Helium', 'B. Neon', 'C. Argon', 'D. Nitrogen'], answer: 'D', explanation: 'Noble gases are in Group 18: He, Ne, Ar, Kr, Xe, Rn. Nitrogen (N₂) is in Group 15.' },
  { subject: 'Chemistry', year: 2023, question: 'What is the name of the process by which plants make food using sunlight?', options: ['A. Respiration', 'B. Photosynthesis', 'C. Transpiration', 'D. Fermentation'], answer: 'B', explanation: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. This is photosynthesis.' },
  { subject: 'Chemistry', year: 2020, question: 'The atomic number of an element is equal to the number of _____.', options: ['A. Neutrons', 'B. Protons', 'C. Electrons and neutrons', 'D. Mass particles'], answer: 'B', explanation: 'Atomic number = number of protons in the nucleus. In a neutral atom, it also equals the number of electrons.' },
  { subject: 'Chemistry', year: 2019, question: 'Which of the following is a good conductor of electricity?', options: ['A. Plastic', 'B. Rubber', 'C. Copper', 'D. Wood'], answer: 'C', explanation: 'Copper is a metal with free electrons, making it an excellent conductor of electricity. Plastic, rubber, and wood are insulators.' },

  // ===== BIOLOGY =====
  { subject: 'Biology', year: 2022, question: 'Which organelle is known as the "powerhouse of the cell"?', options: ['A. Nucleus', 'B. Ribosome', 'C. Mitochondria', 'D. Golgi apparatus'], answer: 'C', explanation: 'Mitochondria produce ATP through cellular respiration, providing energy for cell activities.' },
  { subject: 'Biology', year: 2021, question: 'The process by which water moves across a semi-permeable membrane is called _____.', options: ['A. Diffusion', 'B. Active transport', 'C. Osmosis', 'D. Endocytosis'], answer: 'C', explanation: 'Osmosis is the movement of water molecules from a region of high water concentration to low water concentration through a semi-permeable membrane.' },
  { subject: 'Biology', year: 2020, question: 'Which of the following is NOT a function of the skeleton?', options: ['A. Support', 'B. Protection', 'C. Digestion', 'D. Movement'], answer: 'C', explanation: 'The skeleton provides support, protection for organs, and enables movement. Digestion is performed by the digestive system.' },
  { subject: 'Biology', year: 2019, question: 'What is the basic unit of heredity?', options: ['A. Chromosome', 'B. Gene', 'C. DNA', 'D. Nucleus'], answer: 'B', explanation: 'A gene is the basic unit of heredity — a sequence of DNA that codes for a specific protein or trait.' },
  { subject: 'Biology', year: 2022, question: 'Blood type is determined by _____.', options: ['A. The type of food eaten', 'B. The presence of antigens on red blood cells', 'C. The color of blood', 'D. The size of red blood cells'], answer: 'B', explanation: 'ABO blood types are determined by the presence or absence of A and B antigens on the surface of red blood cells.' },
  { subject: 'Biology', year: 2018, question: 'Which part of the brain controls balance and coordination?', options: ['A. Cerebrum', 'B. Cerebellum', 'C. Medulla oblongata', 'D. Hypothalamus'], answer: 'B', explanation: 'The cerebellum coordinates muscle movements, maintains posture, and controls balance.' },
  { subject: 'Biology', year: 2021, question: 'Photosynthesis occurs in which part of the plant cell?', options: ['A. Mitochondria', 'B. Ribosome', 'C. Chloroplast', 'D. Vacuole'], answer: 'C', explanation: 'Chloroplasts contain chlorophyll and are the site of photosynthesis in plant cells.' },
  { subject: 'Biology', year: 2023, question: 'Which of the following diseases is caused by a virus?', options: ['A. Tuberculosis', 'B. Malaria', 'C. HIV/AIDS', 'D. Cholera'], answer: 'C', explanation: 'HIV (Human Immunodeficiency Virus) is a virus. TB and Cholera are bacterial; Malaria is caused by a protozoan parasite.' },
  { subject: 'Biology', year: 2020, question: 'The process of breaking down food into simpler substances is called _____.', options: ['A. Absorption', 'B. Assimilation', 'C. Digestion', 'D. Egestion'], answer: 'C', explanation: 'Digestion is the mechanical and chemical breakdown of food into smaller molecules that can be absorbed.' },
  { subject: 'Biology', year: 2019, question: 'How many chambers does the human heart have?', options: ['A. 2', 'B. 3', 'C. 4', 'D. 5'], answer: 'C', explanation: 'The human heart has 4 chambers: right atrium, right ventricle, left atrium, and left ventricle.' },
]

const insert = db.prepare(`
  INSERT INTO questions (subject, year, question, options, answer, explanation)
  VALUES (?, ?, ?, ?, ?, ?)
`)

const insertMany = db.transaction((qs) => {
  for (const q of qs) {
    insert.run(q.subject, q.year, q.question, JSON.stringify(q.options), q.answer, q.explanation)
  }
})

insertMany(questions)

console.log(`Seeded ${questions.length} questions into ${DB_PATH}`)
console.log('Subjects:', [...new Set(questions.map(q => q.subject))].join(', '))

db.close()
