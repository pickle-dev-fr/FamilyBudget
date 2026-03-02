#!/bin/sh

echo "Waiting for database..."

until nc -z $POSTGRES_HOST $POSTGRES_PORT; do
  sleep 1
done

echo "Database started"

alembic upgrade head

exec "$@"