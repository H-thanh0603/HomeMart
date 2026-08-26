import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessRuleError extends HttpException {
  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION') {
    super({ success: false, message, code }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class ConflictError extends HttpException {
  constructor(message: string) {
    super({ success: false, message, code: 'CONFLICT' }, HttpStatus.CONFLICT);
  }
}

export class NotFoundError extends HttpException {
  constructor(entity = 'Resource') {
    super({ success: false, message: `${entity} not found`, code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
  }
}
