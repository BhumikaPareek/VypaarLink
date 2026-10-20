import type { Request, Response } from 'express'
import { ZodError } from 'zod'
import * as service from './service'
import { askAssistantSchema } from './schemas'

const handleError = (res: Response, err: unknown) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors,
    })
  }
  if (err instanceof Error && err.message === 'Shop not found') {
    return res.status(404).json({
      status: 'error',
      message: 'Shop not found',
    })
  }
  console.error('[Assistant Controller Error]:', err)
  return res.status(500).json({ status: 'error', message: 'Internal server error' })
}

export const askQuestion = async (req: Request, res: Response) => {
  try {
    const { question } = askAssistantSchema.parse(req.body)
    const result = await service.askBusinessAssistant(req.userId!, question)
    res.json({ status: 'success', data: result })
  } catch (err) {
    handleError(res, err)
  }
}

export const getSuggestions = async (_req: Request, res: Response) => {
  try {
    const categories = service.getAssistantSuggestions()
    res.json({ status: 'success', data: { categories } })
  } catch (err) {
    handleError(res, err)
  }
}
