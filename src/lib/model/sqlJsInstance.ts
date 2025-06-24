import initSqlJs, { type SqlJsStatic } from "sql.js";

let sqlJsInstance: SqlJsStatic | null = null;

export async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsInstance) {
    sqlJsInstance = await initSqlJs({
      locateFile: (file) => `/lib/sqljs/${file}`,
    });
  }
  return sqlJsInstance;
}
