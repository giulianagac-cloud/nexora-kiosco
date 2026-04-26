import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { createSchema } from './schema'

let db

export function initDatabase() {
  const dbPath = app.isPackaged
    ? join(app.getPath('userData'), 'nexora-kiosco.db')
    : join(app.getPath('userData'), 'nexora-kiosco-dev.db')

  db = new Database(dbPath)
  createSchema(db)
  return db
}

export function getDb() {
  return db
}
