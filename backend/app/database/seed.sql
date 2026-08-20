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
