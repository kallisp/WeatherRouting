import os
import psycopg2 #Python adapter for Postgres
from dotenv import load_dotenv

#read environment variables from .env file
load_dotenv() 

conn = psycopg2.connect(
        host="localhost",
        database="vessels_db",
        user=os.environ.get('DB_USERNAME'),
        password=os.environ.get('DB_PASSWORD'))

# Open a cursor to perform database operations
cur = conn.cursor()

#Enable PostGIS (contains geometry/geography)
cur.execute('CREATE EXTENSION postgis;')

#Enable Topology
cur.execute('CREATE EXTENSION postgis_topology;')

# Execute a command: this creates the weather data table
cur.execute('DROP TABLE IF EXISTS climate;')
cur.execute('CREATE TABLE IF NOT EXISTS climate (id serial PRIMARY KEY,'
                                                'ts timestamp NOT NULL,'
                                                'latitude float8 NOT NULL,'
                                                'longitude float8 NOT NULL,'
                                                'vhm0 float8,'
                                                'vmdr float8,'
                                                'vtm10 float8,'
                                                'u10 float8,'
                                                'v10 float8,'
                                                'speed float8,'
                                                'direction float8,'
                                                'geom geometry(Geometry,4326));')

cur.execute('CREATE INDEX IF NOT EXISTS climate_index ON climate USING GIST(geom);')

#Insert values from csv to DB Climate table
f = 'data/CMEMS_ERA5_Jan-Mar2022.csv';
q = "COPY climate(id, ts, latitude, longitude, vhm0, vmdr, vtm10, u10, v10, speed, direction) FROM STDIN DELIMITER ',' CSV HEADER;"
cur.copy_expert(q, open(f, "r"))

cur.execute('UPDATE climate SET geom=ST_SetSRID(ST_Point(longitude, latitude),4326)::geometry;')


# Create wave direction table with lower resolution for arrow map visualization
cur.execute('CREATE TABLE IF NOT EXISTS wavedir05 (id serial PRIMARY KEY,'
                                                'ts timestamp NOT NULL,'
                                                'latitude float8 NOT NULL,'
                                                'longitude float8 NOT NULL,'
                                                'vmdr float8,'
                                                'geom geometry(Geometry,4326));')

cur.execute('CREATE INDEX IF NOT EXISTS wavedir05_index ON wavedir05 USING GIST(geom);')

#Insert values from csv to DB WaveDir05 table
fwind = 'data/CMEMS_WaveDir_Jan-Mar2022_remapCON.csv';
qwind = "COPY wavedir05(id, ts, latitude, longitude, vmdr) FROM STDIN DELIMITER ',' CSV HEADER;"
cur.copy_expert(qwind, open(fwind, "r"))

cur.execute('UPDATE wavedir05 SET geom=ST_SetSRID(ST_Point(longitude, latitude),4326)::geometry;')   

conn.commit()
cur.close()
conn.close()




