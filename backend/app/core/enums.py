import enum


class Role(str, enum.Enum):
    user = "user"
    admin = "admin"


class Theme(str, enum.Enum):
    light = "light"
    dark = "dark"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    done = "done"
    skipped = "skipped"


class TaskSource(str, enum.Enum):
    user = "user"
    ai = "ai"
    uni = "uni"
    google = "google"
    telegram = "telegram"


class EnergyLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Chronotype(str, enum.Enum):
    lark = "lark"
    owl = "owl"
    pigeon = "pigeon"


class AnalyticsPeriod(str, enum.Enum):
    week = "week"
    month = "month"


class AchievementType(str, enum.Enum):
    streak_7 = "streak_7"
    streak_14 = "streak_14"
    streak_30 = "streak_30"
    tasks_50 = "tasks_50"
    tasks_100 = "tasks_100"
    tasks_500 = "tasks_500"
    early_bird = "early_bird"
    night_owl = "night_owl"
