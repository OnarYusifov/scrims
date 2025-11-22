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

## ⚠️ ВАЖНО: Pull Request Workflow (ОБЯЗАТЕЛЬНО!)

**НИКОГДА не пушите напрямую в `dev`!** Всегда используйте Pull Requests.

### Правильный Workflow:

1. **Перед началом работы:**

   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Создать свою ветку:**

   ```bash
   git checkout -b feature/ваша-функция dev
   # или
   git checkout -b fix/описание-бага dev
   ```

3. **Работать над изменениями:**
   - Делать коммиты по мере готовности
   - Писать понятные сообщения коммитов
   - Регулярно синхронизироваться с dev (см. ниже)

4. **Отправить изменения в свою ветку:**

   ```bash
   git push origin feature/ваша-функция
   ```

5. **Создать Pull Request на GitHub:**
   - Перейти на https://github.com/OnarYusifov/scrims
   - Нажать "New Pull Request"
   - Выбрать: `feature/ваша-функция` → `dev`
   - Заполнить описание:
     - Что изменилось?
     - Зачем это нужно?
     - Как протестировать?
   - Нажать "Create Pull Request"
   - **Дождаться ревью и одобрения перед мерджем!**

6. **После одобрения и мерджа PR:**
   ```bash
   git checkout dev
   git pull origin dev
   git branch -d feature/ваша-функция  # удалить локальную ветку
   ```

### Синхронизация своей ветки с dev (во время работы):

Если в `dev` появились новые изменения, пока вы работаете:

```bash
# На вашей feature ветке
git checkout feature/ваша-функция

# Получить последние изменения
git fetch origin

# Обновить dev локально
git checkout dev
git pull origin dev

# Вернуться на свою ветку
git checkout feature/ваша-функция

# Влить изменения из dev в свою ветку
git merge dev
# или (предпочтительно для чистой истории)
git rebase dev

# Если были конфликты, разрешить их, затем:
git add .
git commit -m "Resolve conflicts with dev"

# Отправить обновлённую ветку
git push origin feature/ваша-функция
# Если использовали rebase, может понадобиться:
git push origin feature/ваша-функция --force-with-lease
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

## 🚨 КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА

1. ✅ **НИКОГДА не пушите напрямую в `dev`** - только через Pull Request!
2. ✅ **Всегда работайте в отдельной ветке** - создавайте feature/fix ветки
3. ✅ **Используйте Pull Request для всех изменений** - даже для маленьких фиксов
4. ✅ **Дождитесь ревью перед мерджем** - не мерджите свой PR самостоятельно
5. ✅ Регулярно синхронизируйтесь с `dev` (`git pull origin dev` в своей ветке)
6. ✅ Делайте частые коммиты с понятными сообщениями
7. ✅ Перед созданием PR проверяйте свои изменения (`git status`, `git diff`)
8. ✅ Обсуждайте большие изменения перед началом работы
9. ✅ **Проверяйте, что ваш код проходит линтинг и билд** перед созданием PR

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
