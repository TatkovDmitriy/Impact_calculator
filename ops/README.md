# ops/ — DevOps Infrastructure

Владелец: **DevOps-агент** ([agents/05_DevOps_Agent.md](../agents/05_DevOps_Agent.md))

Canonical infra-документ: [docs/11_DevOps.md](../docs/11_DevOps.md)

---

## Структура

```
ops/
├── bootstrap/
│   ├── personal_pc.md    ← онбординг личного ПК (web-разработка)
│   └── work_pc.md        ← онбординг рабочего ПК (DA / research-скрипты)
├── health_checks/
│   ├── check_all.ps1     ← оркестратор, запускать перед DA-сессией
│   ├── check_vpn.ps1     ← проверка VPN-соединения
│   ├── check_gp.py       ← проверка Greenplum
│   └── check_firebase.py ← проверка Firebase Admin SDK
├── hooks/
│   └── pre-commit        ← git hook: блокирует секреты и файлы >5MB
└── README.md             ← этот файл
```

Runbook'и появятся по мере возникновения инцидентов в `ops/runbooks/`.

---

## Быстрый старт

**Личный ПК:** → [bootstrap/personal_pc.md](bootstrap/personal_pc.md)

**Рабочий ПК:** → [bootstrap/work_pc.md](bootstrap/work_pc.md)

**Перед DA-сессией:**
```powershell
# из корня репо
.\ops\health_checks\check_all.ps1
```
