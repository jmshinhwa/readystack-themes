-- legacy schema + ops scripts carried over from Aurora MySQL version 2
-- terraform: engine_version = "5.7.mysql_aurora.2.11.2", family aurora-mysql5.7
SET GLOBAL query_cache_type = 1;
SET SESSION tx_isolation = 'READ-COMMITTED';
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER';

GRANT SELECT ON app.* TO 'report'@'%' IDENTIFIED BY 's3cret';
SET PASSWORD FOR 'app'@'%' = PASSWORD('rotate-me');

CREATE TABLE leaderboard (
  id INT PRIMARY KEY,
  rank INT NOT NULL,
  groups VARCHAR(64)
) ENGINE=InnoDB;

CREATE TABLE audit_2019 (id INT, at DATETIME) ENGINE=MyISAM
  PARTITION BY RANGE (id) (PARTITION p0 VALUES LESS THAN (1000));

SELECT SQL_CACHE player, COUNT(*) FROM scores GROUP BY player DESC;
SELECT id, ENCRYPT(token) FROM api_keys;
SELECT AsText(GeomFromText('POINT(1 1)'));
EXPLAIN EXTENDED SELECT * FROM leaderboard;
SELECT TABLE_ID, NAME FROM information_schema.INNODB_SYS_TABLES;
