"""Expense CRUD and summary endpoints.

Security note: every query filters by user_id taken from the TOKEN,
never from the request — the classic defense against IDOR.
Aggregation happens in SQL (GROUP BY), not in Python.
"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user
from ..models import Expense, User
from ..schemas import ExpenseIn, ExpenseOut, CategorySummary, MonthSummary

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(body: ExpenseIn,
                   db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    e = Expense(user_id=user.id, **body.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@router.get("", response_model=list[ExpenseOut])
def list_expenses(start: date | None = None,
                  end: date | None = None,
                  category: str | None = None,
                  db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    q = select(Expense).where(Expense.user_id == user.id)
    if start:
        q = q.where(Expense.spent_at >= start)
    if end:
        q = q.where(Expense.spent_at <= end)
    if category:
        q = q.where(Expense.category == category)
    return db.scalars(q.order_by(Expense.spent_at.desc(),
                                 Expense.created_at.desc())).all()


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: uuid.UUID,
                   db: Session = Depends(get_db),
                   user: User = Depends(get_current_user)):
    e = db.get(Expense, expense_id)
    # 404 either way: don't reveal whether other users' row IDs exist.
    if e is None or e.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    db.delete(e)
    db.commit()


@router.get("/summary/by-category", response_model=list[CategorySummary])
def by_category(db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    rows = db.execute(
        select(Expense.category,
               func.sum(Expense.amount).label("total"))
        .where(Expense.user_id == user.id, Expense.kind == "expense")
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
    ).all()
    return [CategorySummary(category=r.category, total=r.total) for r in rows]


@router.get("/summary/by-month", response_model=list[MonthSummary])
def by_month(db: Session = Depends(get_db),
             user: User = Depends(get_current_user)):
    month = func.to_char(Expense.spent_at, "YYYY-MM").label("month")
    rows = db.execute(
        select(
            month,
            func.coalesce(func.sum(case(
                (Expense.kind == "expense", Expense.amount))), 0
            ).label("expenses"),
            func.coalesce(func.sum(case(
                (Expense.kind == "income", Expense.amount))), 0
            ).label("income"),
        )
        .where(Expense.user_id == user.id)
        .group_by(month)
        .order_by(month)
    ).all()
    return [MonthSummary(month=r.month, expenses=r.expenses, income=r.income)
            for r in rows]
