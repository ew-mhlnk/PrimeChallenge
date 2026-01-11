from sqladmin import ModelView
from database.models import User, Tournament, DailyMatch, DailyPick

class UserAdmin(ModelView, model=User):
    column_list = [User.user_id, User.username, User.first_name]
    can_create = False
    name = "Пользователь"
    name_plural = "Пользователи"
    icon = "fa-solid fa-user"

class DailyMatchAdmin(ModelView, model=DailyMatch):
    column_list = [DailyMatch.id, DailyMatch.start_time, DailyMatch.player1, DailyMatch.player2, DailyMatch.status, DailyMatch.winner]
    column_searchable_list = [DailyMatch.player1, DailyMatch.player2, DailyMatch.tournament]
    column_sortable_list = [DailyMatch.start_time]
    column_default_sort = ("start_time", True)
    page_size = 50
    name = "Дейли Матч"
    name_plural = "Дейли Матчи"
    icon = "fa-solid fa-table-tennis"

class DailyPickAdmin(ModelView, model=DailyPick):
    column_list = [DailyPick.user_id, DailyPick.match_id, DailyPick.predicted_winner, DailyPick.is_correct]
    name = "Прогноз"
    name_plural = "Прогнозы"
    icon = "fa-solid fa-check"

class TournamentAdmin(ModelView, model=Tournament):
    column_list = [Tournament.id, Tournament.name, Tournament.status]
    name = "Турнир"
    name_plural = "Турниры"
    icon = "fa-solid fa-trophy"