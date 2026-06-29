from datetime import date, timedelta


def get_week_dates(year: int, week: int) -> tuple[date, date]:
    """Return (monday, sunday) for %W week number (Monday start)."""
    jan1 = date(year, 1, 1)
    days_to_first_monday = (7 - jan1.weekday()) % 7
    if days_to_first_monday == 7:
        days_to_first_monday = 0
    first_monday = jan1 + timedelta(days=days_to_first_monday)
    if week == 0:
        week_start = jan1
        week_end = first_monday - timedelta(days=1)
    else:
        week_start = first_monday + timedelta(weeks=week - 1)
        week_end = week_start + timedelta(days=6)
    return week_start, week_end
