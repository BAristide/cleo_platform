# payroll/services/__init__.py
from .parameter_resolver import PayrollParameterResolver
from .salary_calculator import SalaryCalculator

__all__ = ['PayrollParameterResolver', 'SalaryCalculator']
