import gspread
from oauth2client.service_account import ServiceAccountCredentials
import json
from config import GOOGLE_SHEET_ID, GOOGLE_CREDENTIALS

scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
# Преобразуем строку JSON в словарь
google_credentials_dict = json.loads(GOOGLE_CREDENTIALS)
creds = ServiceAccountCredentials.from_json_keyfile_dict(google_credentials_dict, scope)
client = gspread.authorize(creds)

def get_tournaments():
    sheet = client.open_by_key(GOOGLE_SHEET_ID).worksheet("Tournaments")
    data = sheet.get_all_records()
    return data

def get_tournament_matches(tournament_name: str):
    sheet = client.open_by_key(GOOGLE_SHEET_ID).worksheet("Matches")
    all_matches = sheet.get_all_records()
    tournament_matches = [match for match in all_matches if match['Tournament'] == tournament_name]
    
    for match in tournament_matches:
        score = match.get('Score', '')
        sets = score.split(', ') if score else []
        for i in range(5):
            match[f'set{i+1}'] = sets[i] if i < len(sets) else None
    
    return tournament_matches