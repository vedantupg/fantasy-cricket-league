export const generateLeagueCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

export const isValidLeagueCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code);
};