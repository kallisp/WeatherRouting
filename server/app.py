import os
import psycopg2
from dotenv import load_dotenv
from flask import Flask, render_template, jsonify

#read environment variables from .env file
load_dotenv()

app = Flask(__name__)

def get_db_connection():
    conn = psycopg2.connect(host='localhost',
                            database='vessels_db',
                            user=os.environ.get('DB_USERNAME'),
                            password=os.environ.get('DB_PASSWORD'))
    return conn
   
app = Flask(__name__)   

@app.route('/', methods=['GET'])    
def home():  
    return render_template('index.html') 
   

@app.route('/wind/time/<timestamp>', methods=['GET'])    
def wind(timestamp):  
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT u10, v10 FROM climate WHERE ts=%s ORDER BY id ASC", [timestamp])
    
    windData = cur.fetchall()
    cur.close()
    conn.close()  
    if (len(windData) > 0 ) :
        return jsonify(windData) 
    return jsonify([])


@app.route('/wave/time/<timestamp>', methods=['GET'])    
def wave(timestamp):  
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT latitude, longitude, vmdr FROM waveDir05 WHERE (ts=%s AND vmdr IS NOT NULL) ORDER BY id ASC", [timestamp])
    
    waveDirectionData = cur.fetchall()
    cur.close()
    conn.close()  
    if (len(waveDirectionData) > 0 ) :
        return jsonify(waveDirectionData) 
    return jsonify([])


@app.route('/weather/coords/<lon>:<lat>/time/<currentTime>', methods=['GET'])  
def getWeatherData(lon, lat, currentTime):  
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""SELECT vhm0, vmdr, vtm10, speed FROM climate 
                WHERE (ts=%s) ORDER BY geom <-> 'SRID=4326;POINT(%s %s)'::geometry LIMIT 1""",  
                    (currentTime, float(lon), float(lat)))                                 
    weatherData = cur.fetchall()
    cur.close()
    conn.close()  
    if (len(weatherData) >= 0 ) :
        return jsonify(weatherData) 
    return jsonify([])


@app.route('/route/coords/<lon>:<lat>/heading/<heading>/time/<timestamp>', methods=['GET'])  
def initialRoute(lon, lat, heading, timestamp):  
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""SELECT latitude, longitude, vhm0, ABS(vmdr - %s), vmdr, vtm10, speed FROM climate 
                WHERE ((ts=%s) AND (vhm0 IS NOT NULL) AND (vmdr IS NOT NULL) AND (vtm10 IS NOT NULL) AND (speed IS NOT NULL))
                ORDER BY geom <-> 'SRID=4326;POINT(%s %s)'::geometry LIMIT 1""",  
                    (float(heading), timestamp, float(lon), float(lat)))                                    
    initialRouteData = cur.fetchall()
    cur.close()
    conn.close()  
    if (len(initialRouteData) >= 0 ) :
        return jsonify(initialRouteData) 
    return jsonify([])


@app.route('/proposedRoute/coords/<lon>:<lat>/heading/<heading>/time/<timestamp>', methods=['GET'])     
def proposedRoute(lon, lat, heading, timestamp):  
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""SELECT latitude, longitude, vhm0, ABS(vmdr - %s), vmdr, vtm10, speed FROM climate
                    WHERE (ts=%s AND (vhm0<4.5 AND vtm10<8  AND speed<19)) 
                    ORDER BY geom::geometry <-> 'SRID=4326;POINT(%s %s)'::geometry LIMIT 10""",             
                    (float(heading), timestamp, float(lon), float(lat)))                                     
    proposedRoutData = cur.fetchall()                                                                       
    cur.close()
    conn.close()  
    if (len(proposedRoutData) > 0 ) :
        return jsonify(proposedRoutData) 
    return jsonify([])
   
@app.route('/proposedRouteHeading/coords/<lon>:<lat>/heading/<heading>/time/<timestamp>', methods=['GET'])   
def proposedRouteHeading(lon, lat, heading, timestamp):  
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""SELECT ABS(vmdr - %s), vmdr FROM climate
                    WHERE (ts=%s)
                    ORDER BY geom <-> 'SRID=4326;POINT(%s %s)'::geometry LIMIT 1""",  
                    (float(heading), timestamp,  float(lon), float(lat))) 
    proposedRouteHeadingData = cur.fetchall() 
    cur.close()
    conn.close()  
    if (len(proposedRouteHeadingData) > 0 ) :
        return jsonify(proposedRouteHeadingData) 
    return jsonify([])


if __name__ =='__main__':  
    app.run(debug = True) 