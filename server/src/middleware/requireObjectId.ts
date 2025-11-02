
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export function requireObjectId(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid_id", param: paramName });
    }
    next();
  };
}