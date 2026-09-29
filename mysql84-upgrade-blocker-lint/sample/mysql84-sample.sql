-- ops/replica_rebuild.sql : runbook still written for MySQL 8.0
STOP SLAVE;
CHANGE MASTER TO MASTER_HOST='10.0.1.12', MASTER_USER='repl', MASTER_AUTO_POSITION=1;
START SLAVE;
SHOW SLAVE STATUS;

-- clear blocked hosts after the rebuild
FLUSH HOSTS;

-- legacy app user settings
SET PERSIST_ONLY default_authentication_plugin = 'mysql_native_password';
