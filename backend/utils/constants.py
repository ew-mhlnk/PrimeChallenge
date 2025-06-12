# backend/utils/constants.py
ROUNDS = ["R128", "R64", "R32", "R16", "QF", "SF", "F"]
ROUND_ORDER = {round_name: idx for idx, round_name in enumerate(ROUNDS)}