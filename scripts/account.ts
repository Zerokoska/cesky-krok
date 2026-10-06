// Creates a role account or sets a new password for it. The password is typed
// by you in the terminal (not shown, not stored anywhere).
//   node scripts/account.ts teacher
//   node scripts/account.ts student
//   node scripts/account.ts status
import readline from 'node:readline';
import { ROLE_LOGIN } from '../src/config.ts';
import { admin } from './supabase-admin.ts';

type Role = keyof typeof ROLE_LOGIN;

async function findUser(email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit || data.users.length < 200) return hit ?? null;
  }
}

function askHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    console.error('Запустіть команду в терміналі, щоб ввести пароль. Нічого не змінено.');
    process.exit(1);
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      // Echo the prompt and line breaks, hide the typed characters.
      if (s.startsWith(question) || s === '\r\n' || s === '\n') write.call(rl, s);
      else write.call(rl, '*'.repeat(s.length));
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const arg = process.argv[2];
const NAMES: Record<Role, string> = { teacher: 'Вчитель', student: 'Учениця' };

if (arg === 'status') {
  for (const role of Object.keys(ROLE_LOGIN) as Role[]) {
    const user = await findUser(ROLE_LOGIN[role]);
    console.log(`${NAMES[role]}: ${user ? `акаунт є (останній вхід: ${user.last_sign_in_at ?? 'ще не входили'})` : 'акаунта ще немає'}`);
  }
  process.exit(0);
}

if (arg !== 'teacher' && arg !== 'student') {
  console.error('Використання: node scripts/account.ts teacher | student | status');
  process.exit(1);
}

const role: Role = arg;
const email = ROLE_LOGIN[role];
const existing = await findUser(email);
console.log(existing ? `${NAMES[role]}: акаунт уже є — задаємо новий пароль.` : `${NAMES[role]}: створюємо акаунт.`);

const password = await askHidden('Пароль (мінімум 8 символів): ');
if (password.length < 8) {
  console.error('Закороткий пароль — потрібно щонайменше 8 символів.');
  process.exit(1);
}
const again = await askHidden('Повторіть пароль: ');
if (again !== password) {
  console.error('Паролі не збігаються. Нічого не змінено.');
  process.exit(1);
}

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, { password });
  if (error) throw new Error(error.message);
  console.log(`Готово: пароль для «${NAMES[role]}» змінено.`);
} else {
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(error.message);
  console.log(`Готово: акаунт «${NAMES[role]}» створено. Увійдіть на сайті кнопкою «${NAMES[role]}».`);
}
