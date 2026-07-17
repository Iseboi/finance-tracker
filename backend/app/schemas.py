"""Pydantic schemas: the API's contract.

Invalid input (negative amount, bad email, unknown kind) is rejected with
a 422 BEFORE route code runs — validation lives at the boundary.
"""
import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ExpenseIn(BaseModel):
    amount: Decimal = Field(gt=0)
    category: str = Field(min_length=1, max_length=50)
    description: str | None = None
    kind: str = Field(default="expense", pattern="^(expense|income)$")
    spent_at: date


class ExpenseOut(ExpenseIn):
    id: uuid.UUID

    class Config:
        from_attributes = True


class CategorySummary(BaseModel):
    category: str
    total: Decimal


class MonthSummary(BaseModel):
    month: str
    expenses: Decimal
    income: Decimal
