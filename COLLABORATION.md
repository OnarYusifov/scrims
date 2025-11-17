# Инструкция для совместной работы

## Настройка репозитория

Репозиторий уже настроен и подключён к:
- **Remote URL**: `https://github.com/OnarYusifov/scrims.git`
- **Текущая ветка**: `dev`
- **Отслеживание**: `origin/dev`

## Основные команды для работы

### Получение последних изменений
```bash
git pull origin dev
```

### Создание новой ветки для работы
```bash
# Создать ветку от dev
git checkout -b feature/название-функции dev

# Или для исправления бага
git checkout -b fix/описание-бага dev
```

### Работа с изменениями
```bash
# Посмотреть статус
git status

# Добавить файлы
git add .

# Или добавить конкретные файлы
git add путь/к/файлу

# Создать коммит
git commit -m "Описание изменений"

# Отправить изменения
git push origin название-вашей-ветки
```

### Синхронизация с dev
```bash
# Переключиться на dev
git checkout dev

# Получить последние изменения
git pull origin dev

# Вернуться на свою ветку
git checkout название-вашей-ветки

# Обновить свою ветку изменениями из dev
git merge dev
# или
git rebase dev
```

## Workflow для совместной работы

1. **Перед началом работы:**
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Создать свою ветку:**
   ```bash
   git checkout -b feature/ваша-функция dev
   ```

3. **Работать над изменениями:**
   - Делать коммиты по мере готовности
   - Писать понятные сообщения коммитов

4. **Отправить изменения:**
   ```bash
   git push origin feature/ваша-функция
   ```

5. **Создать Pull Request на GitHub:**
   - Перейти на GitHub
   - Создать Pull Request из вашей ветки в `dev`
   - Дождаться ревью и одобрения

6. **После мерджа:**
   ```bash
   git checkout dev
   git pull origin dev
   git branch -d feature/ваша-функция  # удалить локальную ветку
   ```

## Полезные команды

### Просмотр истории
```bash
git log --oneline --graph --all
```

### Просмотр изменений
```bash
git diff
git diff --staged
```

### Отмена изменений
```bash
# Отменить изменения в файле (до git add)
git checkout -- файл

# Убрать файл из staging (после git add)
git reset HEAD файл

# Отменить последний коммит (сохранить изменения)
git reset --soft HEAD~1
```

### Просмотр удалённых веток
```bash
git branch -r
git fetch origin
```

## Настройка Git (если ещё не настроено)

```bash
git config --global user.name "Ваше Имя"
git config --global user.email "ваш@email.com"
```

## Важные правила

1. ✅ Всегда работайте в отдельной ветке, не коммитьте напрямую в `dev`
2. ✅ Регулярно синхронизируйтесь с `dev` (`git pull origin dev`)
3. ✅ Делайте частые коммиты с понятными сообщениями
4. ✅ Перед отправкой проверяйте свои изменения (`git status`, `git diff`)
5. ✅ Используйте Pull Request для слияния изменений
6. ✅ Обсуждайте большие изменения перед началом работы

## Проблемы и решения

### Конфликты при merge
```bash
# Если возникли конфликты
git status  # посмотреть конфликтующие файлы
# Отредактировать файлы, разрешив конфликты
git add .
git commit -m "Resolve merge conflicts"
```

### Откат к последнему коммиту
```bash
git reset --hard HEAD
```

### Просмотр удалённых изменений без слияния
```bash
git fetch origin
git log HEAD..origin/dev
```

