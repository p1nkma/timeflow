import enum


class Role(enum.StrEnum):
    user = "user"
    admin = "admin"


class Theme(enum.StrEnum):
    light = "light"
    dark = "dark"


class TaskStatus(enum.StrEnum):
    pending = "pending"
    done = "done"
    skipped = "skipped"


class TaskSource(enum.StrEnum):
    user = "user"
    ai = "ai"
    uni = "uni"
    google = "google"
    telegram = "telegram"


class EnergyLevel(enum.StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class Chronotype(enum.StrEnum):
    lark = "lark"
    owl = "owl"
    pigeon = "pigeon"


class AnalyticsPeriod(enum.StrEnum):
    week = "week"
    month = "month"


class AchievementType(enum.StrEnum):
    streak_7 = "streak_7"
    streak_14 = "streak_14"
    streak_30 = "streak_30"
    tasks_50 = "tasks_50"
    tasks_100 = "tasks_100"
    tasks_500 = "tasks_500"
    early_bird = "early_bird"
    night_owl = "night_owl"
