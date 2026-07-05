import requests
import subprocess
import json
import os

# J.A.R.V.I.S. Local Automation Client
# Para Henrique (clebsantos) - Zorin OS

# Configure a URL do seu J.A.R.V.I.S. aqui
JARVIS_URL = "https://ais-pre-4at2xgdejmegqdwa63blsk-262545535533.us-east5.run.app"

def get_wmctrl_data():
    try:
        # Tenta ler as janelas ativas no Zorin OS
        output = subprocess.check_output(["wmctrl", "-l"], stderr=subprocess.STDOUT).decode()
        return output
    except Exception:
        return "WMCTRL nao disponivel no ambiente atual."

def get_system_stats():
    try:
        # Simples captura de carga
        cpu = subprocess.check_output(["top", "-bn1", "|", "grep", "Cpu(s)"], shell=True).decode()
        return cpu.strip()
    except Exception:
        return "Stats nao disponiveis."

def interact_with_jarvis(message):
    context = f"WMCTRL: {get_wmctrl_data()}\nSTATS: {get_system_stats()}"
    
    payload = {
        "message": message,
        "context": context
    }
    
    try:
        response = requests.post(f"{JARVIS_URL}/api/interact", json=payload)
        if response.status_code == 200:
            data = response.json()
            return data.get("response", "Sem resposta do Jarvis.")
        else:
            return f"Erro na conexao com o Jarvis: {response.status_code}"
    except Exception as e:
        return f"Falha ao contatar o Jarvis: {str(e)}"

if __name__ == "__main__":
    print("--- [SISTEMA J.A.R.V.I.S. - PROTOCOLO DE AUTOMACAO] ---")
    while True:
        cmd = input("\n[USR] > ")
        if cmd.lower() in ["exit", "sair", "quit"]:
            break
            
        print("\n[J.A.R.V.I.S. ESTA PENSANDO...]")
        res = interact_with_jarvis(cmd)
        print(f"\n[JAV] > {res}")
