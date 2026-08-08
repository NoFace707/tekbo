#!/bin/sh
set -e

echo "Waiting for database..."
python manage.py wait_for_db

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Collecting static files (optional)..."
python manage.py collectstatic --noinput || true

echo "Ensuring default admin exists..."
python manage.py seed_admin

exec "$@"
