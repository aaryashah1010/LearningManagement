-- Local dev seed data. Password: "password". First account must be admin — see docs/accounts-and-roster.md § Teacher Account Creation.
INSERT INTO teachers (name, email, password_hash, role) VALUES
    ('Dev Admin', 'admin@example.com', '$2b$12$7SZHf8ehFhsKppwPfEQFCeN6SDY9LAq1j1Y/plzIc6Lm9tkeLs2s.', 'admin');

-- Curriculum data is developer-entered from the book/mathemetics class-10/ source, not app-generated — see curriculum-taxonomy.md.
-- Each chapter's "Introduction"/"Summary" subsections are skipped as Topics — boilerplate framing, not testable content.
INSERT INTO subjects (name) VALUES ('Mathematics');
SET @subject_id = LAST_INSERT_ID();

-- pdf_url is NCERT's own official page, not a copy we host ourselves — see database-design.md § Design Decisions.
INSERT INTO ncert_books (subject_id, title, grade, edition_year, pdf_url) VALUES
    (@subject_id, 'Mathematics', 'Class 10', 2022, 'https://ncert.nic.in/textbook.php?jemh1=1-15');
SET @book_id = LAST_INSERT_ID();

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Real Numbers', 1, 9);
SET @ch1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch1, 'topic', 'The Fundamental Theorem of Arithmetic', 2, 5);
SET @ch1_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch1_t1, 'subtopic', 'Fundamental Theorem of Arithmetic - Statement and Prime Factorisation', 2, 4),
    (@book_id, @ch1_t1, 'subtopic', 'HCF and LCM using Prime Factorisation Method', 4, 5);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch1, 'topic', 'Revisiting Irrational Numbers', 6, 9);
SET @ch1_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch1_t2, 'subtopic', 'Proving Irrationality of Square Roots of Primes', 6, 8),
    (@book_id, @ch1_t2, 'subtopic', 'Irrationality of Expressions Combining Rational and Irrational Numbers', 8, 9);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Polynomials', 10, 23);
SET @ch2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch2, 'topic', 'Geometrical Meaning of the Zeroes of a Polynomial', 11, 17);
SET @ch2_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch2_t1, 'subtopic', 'Zeroes as x-intercepts - Linear and Quadratic Polynomials', 11, 15),
    (@book_id, @ch2_t1, 'subtopic', 'Zeroes as x-intercepts - Cubic Polynomials and Maximum Zero Count', 15, 17);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch2, 'topic', 'Relationship between Zeroes and Coefficients of a Polynomial', 18, 23);
SET @ch2_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch2_t2, 'subtopic', 'Sum and Product of Zeroes of a Quadratic Polynomial', 18, 21),
    (@book_id, @ch2_t2, 'subtopic', 'Relationship between Zeroes and Coefficients - Cubic Polynomials', 21, 23);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Pair of Linear Equations in Two Variables', 24, 37);
SET @ch3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch3, 'topic', 'Graphical Method of Solution of a Pair of Linear Equations', 25, 29);
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch3, 'topic', 'Algebraic Methods of Solving a Pair of Linear Equations', 30, 37);
SET @ch3_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch3_t2, 'subtopic', 'Substitution Method', 30, 33),
    (@book_id, @ch3_t2, 'subtopic', 'Elimination Method', 34, 37);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Quadratic Equations', 38, 48);
SET @ch4 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch4, 'topic', 'Quadratic Equations', 39, 41),
    (@book_id, @ch4, 'topic', 'Solution of a Quadratic Equation by Factorisation', 42, 43);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch4, 'topic', 'Nature of Roots', 44, 48);
SET @ch4_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch4_t3, 'subtopic', 'Discriminant and Nature of Roots', 44, 45),
    (@book_id, @ch4_t3, 'subtopic', 'Word Problems Using the Discriminant and Quadratic Formula', 45, 48);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Arithmetic Progressions', 49, 72);
SET @ch5 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch5, 'topic', 'Arithmetic Progressions', 51, 55);
SET @ch5_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch5_t1, 'subtopic', 'Definition, Common Difference, and General Form of an AP', 51, 53),
    (@book_id, @ch5_t1, 'subtopic', 'Determining Whether a Given List of Numbers Forms an AP', 53, 55);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch5, 'topic', 'nth Term of an AP', 56, 62);
SET @ch5_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch5_t2, 'subtopic', 'Derivation and Direct Application of the nth Term Formula', 56, 58),
    (@book_id, @ch5_t2, 'subtopic', 'Finding n, Checking Term Membership, and Terms from the End', 58, 62);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch5, 'topic', 'Sum of First n Terms of an AP', 63, 72);
SET @ch5_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch5_t3, 'subtopic', 'Derivation of the Sum Formula and Sum of First n Positive Integers', 63, 67),
    (@book_id, @ch5_t3, 'subtopic', 'Applications of the Sum Formula - Word Problems and Finding a, d, or n from S', 67, 72);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Triangles', 73, 98);
SET @ch6 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch6, 'topic', 'Similar Figures', 74, 78);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch6, 'topic', 'Similarity of Triangles', 79, 84);
SET @ch6_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch6_t2, 'subtopic', 'Basic Proportionality Theorem (Thales Theorem)', 79, 81),
    (@book_id, @ch6_t2, 'subtopic', 'Converse of the Basic Proportionality Theorem', 81, 84);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch6, 'topic', 'Criteria for Similarity of Triangles', 85, 98);
SET @ch6_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch6_t3, 'subtopic', 'AAA and AA Similarity Criterion', 85, 88),
    (@book_id, @ch6_t3, 'subtopic', 'SSS Similarity Criterion', 88, 89),
    (@book_id, @ch6_t3, 'subtopic', 'SAS Similarity Criterion', 90, 98);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Coordinate Geometry', 99, 112);
SET @ch7 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch7, 'topic', 'Distance Formula', 100, 105);
SET @ch7_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch7_t1, 'subtopic', 'Derivation of the Distance Formula', 100, 102),
    (@book_id, @ch7_t1, 'subtopic', 'Applications - Collinearity, Identifying Shapes, and Equidistant Points', 102, 105);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch7, 'topic', 'Section Formula', 106, 112);
SET @ch7_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch7_t2, 'subtopic', 'Derivation of the Section Formula and Mid-Point Formula', 106, 108),
    (@book_id, @ch7_t2, 'subtopic', 'Applications - Finding Ratios, Trisection Points, and Parallelogram Vertices', 108, 112);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Introduction to Trigonometry', 113, 132);
SET @ch8 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch8, 'topic', 'Trigonometric Ratios', 114, 120);
SET @ch8_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch8_t1, 'subtopic', 'Definitions of the Six Trigonometric Ratios of an Acute Angle', 114, 117),
    (@book_id, @ch8_t1, 'subtopic', 'Finding Other Trigonometric Ratios Given One Ratio', 117, 120);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch8, 'topic', 'Trigonometric Ratios of Some Specific Angles', 121, 127);
SET @ch8_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch8_t2, 'subtopic', 'Trigonometric Ratios of 0, 30, 45, 60, and 90 Degrees', 121, 125),
    (@book_id, @ch8_t2, 'subtopic', 'Evaluating Expressions and Solving for Angles Using Standard Values', 125, 127);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch8, 'topic', 'Trigonometric Identities', 128, 132);
SET @ch8_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch8_t3, 'subtopic', 'Derivation of the Pythagorean Trigonometric Identities', 128, 129),
    (@book_id, @ch8_t3, 'subtopic', 'Proving Trigonometric Identities', 129, 132);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Some Applications of Trigonometry', 133, 143);
SET @ch9 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch9, 'topic', 'Heights and Distances', 133, 143);
SET @ch9_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch9_t1, 'subtopic', 'Single Right-Triangle Problems with One Angle of Elevation or Depression', 133, 138),
    (@book_id, @ch9_t1, 'subtopic', 'Two-Triangle Problems with Multiple Angles, Depression, or Moving Objects', 138, 143);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Circles', 144, 153);
SET @ch10 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch10, 'topic', 'Tangent to a Circle', 145, 146);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch10, 'topic', 'Number of Tangents from a Point on a Circle', 147, 153);
SET @ch10_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch10_t2, 'subtopic', 'Cases for the Number of Tangents and the Equal Tangent Lengths Theorem', 147, 149),
    (@book_id, @ch10_t2, 'subtopic', 'Applications of the Equal Tangent Lengths Theorem', 149, 153);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Areas Related to Circles', 154, 160);
SET @ch11 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch11, 'topic', 'Areas of Sector and Segment of a Circle', 154, 160);
SET @ch11_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch11_t1, 'subtopic', 'Sector Area and Arc Length Formulas', 154, 156),
    (@book_id, @ch11_t1, 'subtopic', 'Segment Area as Sector Area Minus Triangle Area', 156, 160);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Surface Areas and Volumes', 161, 170);
SET @ch12 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch12, 'topic', 'Surface Area of a Combination of Solids', 162, 166);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch12, 'topic', 'Volume of a Combination of Solids', 167, 170);
SET @ch12_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch12_t2, 'subtopic', 'Volume as the Sum of Constituent Solids', 167, 168),
    (@book_id, @ch12_t2, 'subtopic', 'Capacity and Removed-Volume Problems - Subtraction and Differences', 168, 170);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Statistics', 171, 201);
SET @ch13 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch13, 'topic', 'Mean of Grouped Data', 171, 182);
SET @ch13_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch13_t1, 'subtopic', 'Direct Method for the Mean of Grouped Data', 171, 174),
    (@book_id, @ch13_t1, 'subtopic', 'Assumed Mean Method', 174, 176),
    (@book_id, @ch13_t1, 'subtopic', 'Step-Deviation Method', 176, 182);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch13, 'topic', 'Mode of Grouped Data', 183, 187);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch13, 'topic', 'Median of Grouped Data', 188, 201);
SET @ch13_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch13_t3, 'subtopic', 'Cumulative Frequency Distributions and the Median Formula', 188, 193),
    (@book_id, @ch13_t3, 'subtopic', 'Applications - Computing the Median and Finding Missing Frequencies', 194, 201);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Probability', 202, 217);
SET @ch14 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch14, 'topic', 'Probability - A Theoretical Approach', 202, 217);
SET @ch14_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @ch14_t1, 'subtopic', 'Theoretical Probability - Definition, Elementary Events, and Complementary Events', 202, 207),
    (@book_id, @ch14_t1, 'subtopic', 'Applications - Single-Stage Random Selection from Cards, Balls, and Coins', 207, 210),
    (@book_id, @ch14_t1, 'subtopic', 'Continuous Outcomes and Compound Experiments - Number Line, Area, and Two Dice', 210, 214);

-- Science curriculum: all 13 chapters from book/Science-10/ (jesc101-113).
INSERT INTO subjects (name) VALUES ('Science');
SET @subject_id = LAST_INSERT_ID();

INSERT INTO ncert_books (subject_id, title, grade, edition_year, pdf_url) VALUES
    (@subject_id, 'Science', 'Class 10', 2022, 'https://ncert.nic.in/textbook.php?jesc1=1-14');
SET @book_id = LAST_INSERT_ID();

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Chemical Reactions and Equations', 1, 14);
SET @sch1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch1, 'topic', 'Chemical Equations', 2, 5);
SET @sch1_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch1_t1, 'subtopic', 'Writing a Chemical Equation', 2, 3),
    (@book_id, @sch1_t1, 'subtopic', 'Balanced Chemical Equations', 3, 5);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch1, 'topic', 'Types of Chemical Reactions', 6, 13);
SET @sch1_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch1_t2, 'subtopic', 'Combination Reaction', 6, 7),
    (@book_id, @sch1_t2, 'subtopic', 'Decomposition Reaction', 8, 10),
    (@book_id, @sch1_t2, 'subtopic', 'Displacement Reaction', 10, 11),
    (@book_id, @sch1_t2, 'subtopic', 'Double Displacement Reaction', 11, 12),
    (@book_id, @sch1_t2, 'subtopic', 'Oxidation and Reduction', 12, 13);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch1, 'topic', 'Have you Observed the Effects of Oxidation Reactions in Everyday Life?', 13, 14);
SET @sch1_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch1_t3, 'subtopic', 'Corrosion', 13, 13),
    (@book_id, @sch1_t3, 'subtopic', 'Rancidity', 13, 14);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Acids, Bases and Salts', 17, 36);
SET @sch2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch2, 'topic', 'Understanding the Chemical Properties of Acids and Bases', 18, 22);
SET @sch2_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch2_t1, 'subtopic', 'Acids and Bases in the Laboratory', 18, 19),
    (@book_id, @sch2_t1, 'subtopic', 'How do Acids and Bases React with Metals?', 19, 20),
    (@book_id, @sch2_t1, 'subtopic', 'How do Metal Carbonates and Metal Hydrogencarbonates React with Acids?', 20, 21),
    (@book_id, @sch2_t1, 'subtopic', 'How do Acids and Bases React with each other?', 21, 21),
    (@book_id, @sch2_t1, 'subtopic', 'Reaction of Metallic Oxides with Acids', 21, 22),
    (@book_id, @sch2_t1, 'subtopic', 'Reaction of a Non-metallic Oxide with Base', 22, 22);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch2, 'topic', 'What do all Acids and all Bases have in Common?', 22, 24);
SET @sch2_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch2_t2, 'subtopic', 'What Happens to an Acid or a Base in a Water Solution?', 23, 24);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch2, 'topic', 'How Strong are Acid or Base Solutions?', 25, 28);
SET @sch2_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch2_t3, 'subtopic', 'Importance of pH in Everyday Life', 26, 28);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch2, 'topic', 'More about Salts', 28, 36);
SET @sch2_t4 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch2_t4, 'subtopic', 'Family of Salts', 28, 29),
    (@book_id, @sch2_t4, 'subtopic', 'pH of Salts', 29, 29),
    (@book_id, @sch2_t4, 'subtopic', 'Chemicals from Common Salt', 29, 31),
    (@book_id, @sch2_t4, 'subtopic', 'Are the Crystals of Salts really Dry?', 32, 33);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Metals and Non-metals', 37, 57);
SET @sch3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch3, 'topic', 'Physical Properties', 38, 40);
SET @sch3_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch3_t1, 'subtopic', 'Metals', 38, 39),
    (@book_id, @sch3_t1, 'subtopic', 'Non-metals', 39, 40);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch3, 'topic', 'Chemical Properties of Metals', 40, 46);
SET @sch3_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch3_t2, 'subtopic', 'What Happens when Metals are Burnt in Air?', 41, 42),
    (@book_id, @sch3_t2, 'subtopic', 'What Happens when Metals React with Water?', 42, 43),
    (@book_id, @sch3_t2, 'subtopic', 'What Happens when Metals React with Acids?', 43, 44),
    (@book_id, @sch3_t2, 'subtopic', 'How do Metals React with Solutions of other Metal Salts?', 44, 45),
    (@book_id, @sch3_t2, 'subtopic', 'The Reactivity Series', 45, 46);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch3, 'topic', 'How do Metals and Non-metals React?', 46, 49);
SET @sch3_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch3_t3, 'subtopic', 'Properties of Ionic Compounds', 47, 49);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch3, 'topic', 'Occurrence of Metals', 49, 52);
SET @sch3_t4 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch3_t4, 'subtopic', 'Extraction of Metals', 49, 50),
    (@book_id, @sch3_t4, 'subtopic', 'Enrichment of Ores', 50, 51),
    (@book_id, @sch3_t4, 'subtopic', 'Extracting Metals Low in the Activity Series', 51, 51),
    (@book_id, @sch3_t4, 'subtopic', 'Extracting Metals in the Middle of the Activity Series', 51, 52),
    (@book_id, @sch3_t4, 'subtopic', 'Extracting Metals towards the Top of the Activity Series', 52, 52),
    (@book_id, @sch3_t4, 'subtopic', 'Refining of Metals', 52, 53);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch3, 'topic', 'Corrosion', 53, 57);
SET @sch3_t5 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch3_t5, 'subtopic', 'Prevention of Corrosion', 54, 57);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Carbon and its Compounds', 58, 78);
SET @sch4 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch4, 'topic', 'Bonding in Carbon - The Covalent Bond', 59, 61);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch4, 'topic', 'Versatile Nature of Carbon', 62, 68);
SET @sch4_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch4_t2, 'subtopic', 'Saturated and Unsaturated Carbon Compounds', 63, 64),
    (@book_id, @sch4_t2, 'subtopic', 'Chains, Branches and Rings', 64, 65),
    (@book_id, @sch4_t2, 'subtopic', 'Will you be my Friend?', 65, 66),
    (@book_id, @sch4_t2, 'subtopic', 'Homologous Series', 66, 67),
    (@book_id, @sch4_t2, 'subtopic', 'Nomenclature of Carbon Compounds', 67, 68);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch4, 'topic', 'Chemical Properties of Carbon Compounds', 69, 71);
SET @sch4_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch4_t3, 'subtopic', 'Combustion', 69, 70),
    (@book_id, @sch4_t3, 'subtopic', 'Oxidation', 70, 71),
    (@book_id, @sch4_t3, 'subtopic', 'Addition Reaction', 71, 71),
    (@book_id, @sch4_t3, 'subtopic', 'Substitution Reaction', 71, 71);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch4, 'topic', 'Some Important Carbon Compounds - Ethanol and Ethanoic Acid', 71, 74);
SET @sch4_t4 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch4_t4, 'subtopic', 'Properties of Ethanol', 72, 72),
    (@book_id, @sch4_t4, 'subtopic', 'Properties of Ethanoic Acid', 73, 74);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch4, 'topic', 'Soaps and Detergents', 74, 76);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Life Processes', 79, 99);
SET @sch5 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch5, 'topic', 'What are Life Processes?', 79, 81);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch5, 'topic', 'Nutrition', 81, 86);
SET @sch5_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch5_t2, 'subtopic', 'Autotrophic Nutrition', 81, 83),
    (@book_id, @sch5_t2, 'subtopic', 'Heterotrophic Nutrition', 84, 84),
    (@book_id, @sch5_t2, 'subtopic', 'How do Organisms obtain their Nutrition?', 84, 84),
    (@book_id, @sch5_t2, 'subtopic', 'Nutrition in Human Beings', 84, 86);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch5, 'topic', 'Respiration', 87, 90);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch5, 'topic', 'Transportation', 91, 95);
SET @sch5_t4 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch5_t4, 'subtopic', 'Transportation in Human Beings', 91, 94),
    (@book_id, @sch5_t4, 'subtopic', 'Transportation in Plants', 94, 95);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch5, 'topic', 'Excretion', 96, 98);
SET @sch5_t5 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch5_t5, 'subtopic', 'Excretion in Human Beings', 96, 97),
    (@book_id, @sch5_t5, 'subtopic', 'Excretion in Plants', 98, 98);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Control and Coordination', 100, 112);
SET @sch6 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch6, 'topic', 'Animals - Nervous System', 100, 104);
SET @sch6_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch6_t1, 'subtopic', 'What happens in Reflex Actions?', 102, 103),
    (@book_id, @sch6_t1, 'subtopic', 'Human Brain', 103, 104),
    (@book_id, @sch6_t1, 'subtopic', 'How are these Tissues protected?', 105, 105),
    (@book_id, @sch6_t1, 'subtopic', 'How does the Nervous Tissue cause Action?', 105, 105);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch6, 'topic', 'Coordination in Plants', 105, 108);
SET @sch6_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch6_t2, 'subtopic', 'Immediate Response to Stimulus', 106, 106),
    (@book_id, @sch6_t2, 'subtopic', 'Movement Due to Growth', 106, 108);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch6, 'topic', 'Hormones in Animals', 109, 111);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'How do Organisms Reproduce?', 113, 127);
SET @sch7 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch7, 'topic', 'Do Organisms Create Exact Copies of Themselves?', 113, 114);
SET @sch7_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch7_t1, 'subtopic', 'The Importance of Variation', 114, 114);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch7, 'topic', 'Modes of Reproduction Used by Single Organisms', 115, 119);
SET @sch7_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch7_t2, 'subtopic', 'Fission', 115, 116),
    (@book_id, @sch7_t2, 'subtopic', 'Fragmentation', 116, 116),
    (@book_id, @sch7_t2, 'subtopic', 'Regeneration', 116, 117),
    (@book_id, @sch7_t2, 'subtopic', 'Budding', 117, 117),
    (@book_id, @sch7_t2, 'subtopic', 'Vegetative Propagation', 117, 118),
    (@book_id, @sch7_t2, 'subtopic', 'Spore Formation', 118, 119);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch7, 'topic', 'Sexual Reproduction', 119, 126);
SET @sch7_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch7_t3, 'subtopic', 'Why the Sexual Mode of Reproduction?', 119, 120),
    (@book_id, @sch7_t3, 'subtopic', 'Sexual Reproduction in Flowering Plants', 120, 121),
    (@book_id, @sch7_t3, 'subtopic', 'Male Reproductive System', 121, 123),
    (@book_id, @sch7_t3, 'subtopic', 'Female Reproductive System', 123, 124),
    (@book_id, @sch7_t3, 'subtopic', 'What Happens when the Egg is not Fertilised', 124, 124),
    (@book_id, @sch7_t3, 'subtopic', 'Reproductive Health', 124, 125);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Heredity', 128, 133);
SET @sch8 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch8, 'topic', 'Accumulation of Variation during Reproduction', 128, 129);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch8, 'topic', 'Heredity', 129, 133);
SET @sch8_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch8_t2, 'subtopic', 'Inherited Traits', 129, 129),
    (@book_id, @sch8_t2, 'subtopic', 'Rules for the Inheritance of Traits - Mendel''s Contributions', 129, 131),
    (@book_id, @sch8_t2, 'subtopic', 'How do these Traits get Expressed?', 131, 132),
    (@book_id, @sch8_t2, 'subtopic', 'Sex Determination', 132, 133);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Light - Reflection and Refraction', 134, 160);
SET @sch9 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch9, 'topic', 'Reflection of Light', 134, 135);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch9, 'topic', 'Spherical Mirrors', 135, 145);
SET @sch9_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch9_t2, 'subtopic', 'Image Formation by Spherical Mirrors', 137, 138),
    (@book_id, @sch9_t2, 'subtopic', 'Representation of Images Formed by Spherical Mirrors Using Ray Diagrams', 138, 142),
    (@book_id, @sch9_t2, 'subtopic', 'Sign Convention for Reflection by Spherical Mirrors', 142, 143),
    (@book_id, @sch9_t2, 'subtopic', 'Mirror Formula and Magnification', 143, 145);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch9, 'topic', 'Refraction of Light', 145, 158);
SET @sch9_t3 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch9_t3, 'subtopic', 'Refraction through a Rectangular Glass Slab', 146, 148),
    (@book_id, @sch9_t3, 'subtopic', 'The Refractive Index', 148, 149),
    (@book_id, @sch9_t3, 'subtopic', 'Refraction by Spherical Lenses', 150, 152),
    (@book_id, @sch9_t3, 'subtopic', 'Image Formation by Lenses', 152, 153),
    (@book_id, @sch9_t3, 'subtopic', 'Image Formation in Lenses Using Ray Diagrams', 153, 155),
    (@book_id, @sch9_t3, 'subtopic', 'Sign Convention for Spherical Lenses', 155, 155),
    (@book_id, @sch9_t3, 'subtopic', 'Lens Formula and Magnification', 155, 157),
    (@book_id, @sch9_t3, 'subtopic', 'Power of a Lens', 157, 158);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'The Human Eye and the Colourful World', 161, 170);
SET @sch10 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch10, 'topic', 'The Human Eye', 161, 162);
SET @sch10_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch10_t1, 'subtopic', 'Power of Accommodation', 162, 162);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch10, 'topic', 'Defects of Vision and their Correction', 162, 165);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch10, 'topic', 'Refraction of Light through a Prism', 165, 166);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch10, 'topic', 'Dispersion of White Light by a Glass Prism', 166, 167);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch10, 'topic', 'Atmospheric Refraction', 168, 168);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch10, 'topic', 'Scattering of Light', 169, 170);
SET @sch10_t6 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch10_t6, 'subtopic', 'Tyndall Effect', 169, 169),
    (@book_id, @sch10_t6, 'subtopic', 'Why is the colour of the clear Sky Blue?', 169, 169);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Electricity', 171, 194);
SET @sch11 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch11, 'topic', 'Electric Current and Circuit', 171, 172);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch11, 'topic', 'Electric Potential and Potential Difference', 173, 174);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch11, 'topic', 'Circuit Diagram', 174, 176);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch11, 'topic', 'Ohm''s Law', 176, 177);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch11, 'topic', 'Factors on which the Resistance of a Conductor Depends', 177, 181);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch11, 'topic', 'Resistance of a System of Resistors', 181, 188);
SET @sch11_t6 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch11_t6, 'subtopic', 'Resistors in Series', 182, 185),
    (@book_id, @sch11_t6, 'subtopic', 'Resistors in Parallel', 185, 188);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch11, 'topic', 'Heating Effect of Electric Current', 188, 191);
SET @sch11_t7 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch11_t7, 'subtopic', 'Practical Applications of Heating Effect of Electric Current', 190, 191);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch11, 'topic', 'Electric Power', 191, 192);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Magnetic Effects of Electric Current', 195, 207);
SET @sch12 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch12, 'topic', 'Magnetic Field and Field Lines', 196, 197);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch12, 'topic', 'Magnetic Field due to a Current-carrying Conductor', 197, 202);
SET @sch12_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch12_t2, 'subtopic', 'Magnetic Field due to a Current through a Straight Conductor', 198, 199),
    (@book_id, @sch12_t2, 'subtopic', 'Right-Hand Thumb Rule', 199, 200),
    (@book_id, @sch12_t2, 'subtopic', 'Magnetic Field due to a Current through a Circular Loop', 200, 201),
    (@book_id, @sch12_t2, 'subtopic', 'Magnetic Field due to a Current in a Solenoid', 201, 202);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch12, 'topic', 'Force on a Current-carrying Conductor in a Magnetic Field', 202, 204);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch12, 'topic', 'Domestic Electric Circuits', 204, 205);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, NULL, 'chapter', 'Our Environment', 208, 217);
SET @sch13 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch13, 'topic', 'Eco-system - What are its Components?', 208, 210);
SET @sch13_t1 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch13_t1, 'subtopic', 'Food Chains and Webs', 210, 212);

INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch13, 'topic', 'How do our Activities Affect the Environment?', 212, 216);
SET @sch13_t2 = LAST_INSERT_ID();
INSERT INTO curriculum_nodes (book_id, parent_id, level, name, page_start, page_end) VALUES
    (@book_id, @sch13_t2, 'subtopic', 'Ozone Layer and How it is Getting Depleted', 212, 213),
    (@book_id, @sch13_t2, 'subtopic', 'Managing the Garbage we Produce', 213, 216);
