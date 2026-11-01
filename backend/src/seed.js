const bcrypt = require('bcrypt');
const { createTables, dropTables } = require('./schema');
 

const DEMO_PASSWORD = 'Password123!';
 
function seed(db) {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
 
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  const insertChild = db.prepare(
    'INSERT INTO children (name, parent_id, user_id) VALUES (?, ?, ?)'
  );
  const insertLink = db.prepare(
    'INSERT INTO specialist_links (child_id, specialist_id, specialist_type) VALUES (?, ?, ?)'
  );
  const insertEvent = db.prepare(
    'INSERT INTO events (child_id, created_by, title, event_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertTask = db.prepare(
    `INSERT INTO tasks (child_id, assigned_by, title, description, area, due_date, status, done_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertEntry = db.prepare(
    'INSERT INTO entries (child_id, author_id, entry_date, content, edited, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
 
  const run = db.transaction(() => {
    
    dropTables(db);
    createTables(db);
 
   
    const user = (name, email, role) => insertUser.run(name, email, hash, role).lastInsertRowid;
 
    const parent1 = user('Ayse Demir', 'parent1@example.com', 'parent');
    const parent2 = user('Mehmet Kaya', 'parent2@example.com', 'parent');
 
    const teacher = user('Zeynep Arslan', 'teacher1@example.com', 'specialist');
    const psychologist = user('Can Yildiz', 'psychologist1@example.com', 'specialist');
    const doctor = user('Elif Sahin', 'doctor1@example.com', 'specialist');
   
    const unlinked = user('Burak Oz', 'specialist-unlinked@example.com', 'specialist');
 
    const childUser1 = user('Deniz Demir', 'child1@example.com', 'child');
    const childUser2 = user('Ela Kaya', 'child2@example.com', 'child');
 
   
    const deniz = insertChild.run('Deniz Demir', parent1, childUser1).lastInsertRowid;
    const ela = insertChild.run('Ela Kaya', parent2, childUser2).lastInsertRowid;
 
   
    insertLink.run(deniz, teacher, 'teacher');
    insertLink.run(deniz, psychologist, 'psychologist');
    insertLink.run(ela, teacher, 'teacher');
    insertLink.run(ela, doctor, 'doctor');
   
 
    
    insertEvent.run(deniz, teacher, 'Math tutoring', '2026-10-26', '16:00', '17:00');
    insertEvent.run(deniz, psychologist, 'Play session', '2026-10-27', '15:00', '16:00');
    insertEvent.run(deniz, parent1, 'Football practice', '2026-10-28', '17:30', '18:30');
    insertEvent.run(deniz, teacher, 'Reading club', '2026-10-29', '14:00', '15:00');
    insertEvent.run(deniz, parent1, 'Family visit', '2026-10-31', '11:00', '13:00');
    insertEvent.run(deniz, parent1, 'Parent-teacher meeting', '2026-11-02', '15:00', '15:30');
    insertEvent.run(deniz, parent1, 'Swimming lesson', '2026-11-04', '17:00', '18:00');
    insertEvent.run(ela, parent2, 'Piano lesson', '2026-10-27', '16:00', '17:00');
    insertEvent.run(ela, teacher, 'Art class', '2026-10-29', '15:00', '16:30');
 
   
    insertTask.run(deniz, teacher, 'Read a short story aloud', 'Read one page to a family member', 'language', '2026-10-21', 'done', '2026-10-21 18:10:00');
    insertTask.run(deniz, parent1, 'Walk on a line of tape', 'Walk heel to toe along a taped line', 'motor', '2026-10-23', 'done', '2026-10-23 17:45:00');
 
    
    insertTask.run(deniz, teacher, 'Read 10 pages aloud', 'Read ten pages of a picture book', 'language', '2026-10-27', 'done', '2026-10-27 18:30:00');
    insertTask.run(deniz, parent1, 'Practice buttoning a shirt', 'Button a shirt without help', 'self_care', '2026-10-28', 'done', '2026-10-28 08:05:00');
    insertTask.run(deniz, psychologist, 'Draw your family', 'Draw a picture of your family and talk about it', 'emotional', '2026-10-29', 'done', '2026-10-29 19:00:00');
    insertTask.run(deniz, parent1, 'Catch the ball 10 times', 'Play catch with a parent', 'motor', '2026-10-30', 'open', null);
    insertTask.run(deniz, teacher, 'Share a toy with a friend', 'Offer a toy to a friend during play', 'social', '2026-10-31', 'open', null);
    insertTask.run(deniz, teacher, 'Count objects up to 20', 'Count the steps on the way home', 'cognitive', '2026-11-01', 'open', null);
 
    
    insertTask.run(deniz, parent1, 'Pack your own school bag', 'Prepare the bag the evening before', 'self_care', '2026-11-03', 'open', null);
    insertTask.run(deniz, psychologist, 'Name three feelings', 'Say how you felt after school', 'emotional', '2026-11-05', 'open', null);
 
    
    insertTask.run(ela, parent2, 'Practice a short song', 'Play the song once a day', 'cognitive', '2026-10-30', 'done', '2026-10-30 17:20:00');
    insertTask.run(ela, teacher, 'Tell a story about your day', 'Tell it to a family member', 'language', '2026-10-31', 'open', null);
 
    
    insertEntry.run(deniz, teacher, '2026-10-27', 'Focused well during reading. Needed one reminder to stay seated.', 0, null);
    insertEntry.run(deniz, psychologist, '2026-10-28', 'Joined the play activity and described feelings while drawing.', 1, '2026-10-29 09:00:00');
    insertEntry.run(deniz, teacher, '2026-10-30', 'Shared materials with classmates without being asked.', 0, null);
    insertEntry.run(ela, teacher, '2026-10-29', 'Finished the art project and helped a classmate clean up.', 0, null);
    insertEntry.run(ela, doctor, '2026-10-30', 'Routine check-up visit completed. Sleep and appetite as reported by the parent.', 0, null);
 
    
  });
 
  run();
}
 
module.exports = { seed, DEMO_PASSWORD };
 

if (require.main === module) {
  const db = require('./db');
  seed(db);
  const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  console.log('Seed finished:');
  for (const table of ['users', 'children', 'specialist_links', 'events', 'tasks', 'entries']) {
    console.log(`  ${table}: ${count(table)}`);
  }
  console.log(`All demo accounts use the password: ${DEMO_PASSWORD}`);
  db.close();
}