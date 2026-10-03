declare module 'bcryptjs' {
  function hashSync(data: string, saltOrRounds: number | string): string;
  function compareSync(data: string, encrypted: string): boolean;
  function genSaltSync(rounds?: number): string;
  function hash(data: string, saltOrRounds: number | string): Promise<string>;
  function compare(data: string, encrypted: string): Promise<boolean>;
}