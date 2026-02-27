import glob
import logging
import os
import subprocess
from datetime import datetime, timedelta

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

BACKUP_DIR = os.path.join(settings.MEDIA_ROOT, 'backups')


@shared_task(name='core.tasks.backup_database')
def backup_database():
    """
    Backup quotidien de la base PostgreSQL.
    Stocke un dump compressé dans /data/media/backups/.
    Effectue une rotation automatique (suppression > 30 jours).
    """
    os.makedirs(BACKUP_DIR, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'cleo_db_{timestamp}.sql.gz'
    filepath = os.path.join(BACKUP_DIR, filename)

    # Récupérer les credentials depuis les settings Django
    db = settings.DATABASES['default']
    db_name = db['NAME']
    db_user = db['USER']
    db_host = db['HOST']
    db_port = db.get('PORT', '5432')
    db_password = db['PASSWORD']

    # Construire la commande pg_dump
    env = os.environ.copy()
    env['PGPASSWORD'] = db_password

    try:
        cmd_dump = [
            'pg_dump',
            '-h',
            db_host,
            '-p',
            str(db_port),
            '-U',
            db_user,
            '-Fc',  # Format custom (compressé, restaurable avec pg_restore)
            db_name,
        ]

        with open(filepath, 'wb') as f:
            process = subprocess.run(
                cmd_dump,
                stdout=f,
                stderr=subprocess.PIPE,
                env=env,
                timeout=300,  # 5 minutes max
            )

        if process.returncode != 0:
            error_msg = process.stderr.decode().strip()
            logger.error(f'[BACKUP] pg_dump a échoué : {error_msg}')
            # Supprimer le fichier corrompu
            if os.path.exists(filepath):
                os.remove(filepath)
            return {'status': 'error', 'error': error_msg}

        file_size = os.path.getsize(filepath)
        size_mb = round(file_size / (1024 * 1024), 2)

        logger.info(f'[BACKUP] Backup créé : {filename} ({size_mb} MB)')

        # Rotation : supprimer les backups > 30 jours
        cleaned = _cleanup_old_backups(days=30)

        return {
            'status': 'success',
            'filename': filename,
            'size_mb': size_mb,
            'old_backups_removed': cleaned,
        }

    except subprocess.TimeoutExpired:
        logger.error('[BACKUP] pg_dump timeout (> 5 min)')
        if os.path.exists(filepath):
            os.remove(filepath)
        return {'status': 'error', 'error': 'Timeout after 5 minutes'}

    except Exception as e:
        logger.exception(f'[BACKUP] Erreur inattendue : {e}')
        if os.path.exists(filepath):
            os.remove(filepath)
        return {'status': 'error', 'error': str(e)}


def _cleanup_old_backups(days=30):
    """Supprime les fichiers de backup plus anciens que `days` jours."""
    if not os.path.exists(BACKUP_DIR):
        return 0

    cutoff = datetime.now() - timedelta(days=days)
    removed = 0

    for filepath in glob.glob(os.path.join(BACKUP_DIR, 'cleo_db_*.sql.gz')):
        try:
            file_mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
            if file_mtime < cutoff:
                os.remove(filepath)
                removed += 1
                logger.info(
                    f'[BACKUP] Ancien backup supprimé : {os.path.basename(filepath)}'
                )
        except Exception as e:
            logger.warning(f'[BACKUP] Impossible de supprimer {filepath} : {e}')

    return removed


@shared_task(name='core.tasks.backup_database_manual')
def backup_database_manual():
    """Alias pour déclenchement manuel depuis l'API."""
    return backup_database()
