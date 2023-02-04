# README #

## Weather Routing App ##

### Download Weather Data from Copernicus C3S and CMEMS Services ###
<br>

To download and import weather data to a DB a directory named <i><b>setup</i></b> was created

```bash
cd setup
pip install -r requirements.txt 
```

* In order to download wave data from CMEMS service, you have to register: 
https://data.marine.copernicus.eu/register

<br>


## Instructions for downloading weather data in Linux ##

* Copy the .cdsapirc file to home directory (contains url/key creds for C3S Copernicus service)

```bash
cp .cdsapirc /home
```

* Run download_netCDF.py
```bash
python download_netCDF.py
```
<br>

* All datasets will be downloaded in directory <i><b>setup/data</i></b> 

<br>

## Instructions for PostgreSQL DB creation ##

* Manually Install PostgreSQL (app runs in version 13)
</br>

* Run init_db.py in order to create DB as well as tables and indexing

```bash
python init_db.py
```

</br>

## Instructions to run the app ##

* Create virtual environment on server directory

```bash
cd server
python -m venv env
```

* Activate env to install the dependencies:

```bash
env\Scripts\activate
pip install -r requirements.txt 
```

* Run the app in the env environment:

```bash
flask run
```

* Open http://localhost:5000 to view the app in browser

</br>

