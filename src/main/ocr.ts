import { spawn } from 'node:child_process'
import { join } from 'node:path'
import type { OcrModel, OcrResult } from '../shared/types'
import { pythonBin, pythonDir } from './paths'

function runPython(script: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin(), [join(pythonDir(), script), ...args], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (chunk) => {
      out += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      err += String(chunk)
    })
    child.on('error', (error) => {
      reject(error)
    })
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(err.trim() || `${script} exited ${code}`))
        return
      }
      resolve(out.trim())
    })
  })
}

export async function listOcrModels(): Promise<OcrModel[]> {
  const raw = await runPython('ocr_worker.py', ['--list-models'])
  const parsed = JSON.parse(raw) as { models?: OcrModel[] }
  return parsed.models || []
}

export async function recognizeImage(imagePath: string, model?: string): Promise<OcrResult> {
  const args = ['--image', imagePath]
  if (model) args.push('--model', model)
  const raw = await runPython('ocr_worker.py', args)
  return JSON.parse(raw) as OcrResult
}

export async function grabRegion(
  rect: { x: number; y: number; width: number; height: number },
  outPath: string
): Promise<string> {
  await runPython('grab.py', [
    '--left',
    String(Math.round(rect.x)),
    '--top',
    String(Math.round(rect.y)),
    '--width',
    String(Math.round(rect.width)),
    '--height',
    String(Math.round(rect.height)),
    '--out',
    outPath
  ])
  return outPath
}
