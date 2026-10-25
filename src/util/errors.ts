export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class GoneError extends AppError {
  constructor(message: string) {
    super(410, message);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(400, "Validation failed", details);
  }
}
