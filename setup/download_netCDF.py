
import os
import cdsapi
from netCDF4 import Dataset
from netCDF4 import num2date
import numpy as np
import numpy.ma as ma
import xarray as xr
import motuclient
import getpass
from datetime import datetime, time
from dask.base import tokenize
import pandas as pd
from math import pi


#Procedure to donwload Wave data from Copernicus Marine Service (CMEMS)

class MotuOptions:
    def __init__(self, attrs: dict):
        super(MotuOptions, self).__setattr__("attrs", attrs)

    def __setattr__(self, k, v):
        self.attrs[k] = v

    def __getattr__(self, k):
        try:
            return self.attrs[k]
        except KeyError:
            return None


def motu_option_parser(script_template, usr, pwd, output_filename):
    dictionary = dict(
        [e.strip().partition(" ")[::2] for e in script_template.split('--')])
    dictionary['variable'] = [value for (var, value) in [e.strip().partition(" ")[::2] for e in script_template.split('--')] if var == 'variable'] 
    for k, v in list(dictionary.items()):
        if v == '<OUTPUT_DIRECTORY>':
            dictionary[k] = '.'
        if v == '<OUTPUT_FILENAME>':
            dictionary[k] = output_filename
        if v == '<USERNAME>':
            dictionary[k] = usr
        if v == '<PASSWORD>':
            dictionary[k] = pwd
        if k in ['longitude-min', 'longitude-max', 'latitude-min', 
                 'latitude-max', 'depth-min', 'depth-max']:
            dictionary[k] = float(v)
        if k in ['date-min', 'date-max']:
            dictionary[k] = v[1:-1]
        dictionary[k.replace('-','_')] = dictionary.pop(k)
    dictionary.pop('python')
    dictionary['auth_mode'] = 'cas'
    return dictionary


#In order to download data you have to sign up/login to CMEMS -- provide the credentials
USERNAME = input('Enter your username: ')
PASSWORD= getpass.getpass('Enter your password: ')


#Provide output directory/filenames
OUTPUT_FILENAME_Jan_Feb = 'data/CMEMS_Wave3H_Jan-Feb_2022.nc'
OUTPUT_FILENAME_Mar = 'data/CMEMS_Wave3H_Mar_2022.nc'


# Change the variables according to the desired dataset
script_template_Jan_Feb = 'python -m motuclient \
--motu https://nrt.cmems-du.eu/motu-web/Motu \
--service-id GLOBAL_ANALYSISFORECAST_WAV_001_027-TDS \
--product-id cmems_mod_glo_wav_anfc_0.083deg_PT3H-i \
--longitude-min -7.12 --longitude-max 37.25 \
--latitude-min 30.15 --latitude-max 45.95 \
--date-min "2022-01-30 00:00:00" --date-max "2022-02-05 21:00:00" \
--variable VHM0 --variable VMDR --variable VTM10 \
--out-dir <OUTPUT_DIRECTORY> --out-name <OUTPUT_FILENAME> \
--user <USERNAME> --pwd <PASSWORD>'

script_template_Mar = 'python -m motuclient \
--motu https://nrt.cmems-du.eu/motu-web/Motu \
--service-id GLOBAL_ANALYSISFORECAST_WAV_001_027-TDS \
--product-id cmems_mod_glo_wav_anfc_0.083deg_PT3H-i \
--longitude-min -7.12 --longitude-max 37.25 \
--latitude-min 30.15 --latitude-max 45.95 \
--date-min "2022-03-01 00:00:00" --date-max "2022-03-04 21:00:00" \
--variable VHM0 --variable VMDR --variable VTM10 \
--out-dir <OUTPUT_DIRECTORY> --out-name <OUTPUT_FILENAME> \
--user <USERNAME> --pwd <PASSWORD>'

data_request_options_dict_automated_Jan_Feb = motu_option_parser(script_template_Jan_Feb, USERNAME, PASSWORD, OUTPUT_FILENAME_Jan_Feb)
data_request_options_dict_automated_Mar = motu_option_parser(script_template_Mar, USERNAME, PASSWORD, OUTPUT_FILENAME_Mar)

#Motu API executes the downloads
motuclient.motu_api.execute_request(MotuOptions(data_request_options_dict_automated_Jan_Feb))
motuclient.motu_api.execute_request(MotuOptions(data_request_options_dict_automated_Mar))

#Combine Wave datasets into one
waveDs = xr.open_mfdataset([ OUTPUT_FILENAME_Jan_Feb, OUTPUT_FILENAME_Mar], combine = 'nested', concat_dim='time')

#Save the wave combined dataset to a new NetCDF4 file
waveDs.to_netcdf('data/CMEMS_Wave3H_Jan-Mar_2022.nc')

# Retrieve Wind data from Copernicus C3S and store as netCDF4 file using CDS API
c = cdsapi.Client()

windData_Jan_2022 = 'data/ERA5_Wind3H_Jan_2022.nc'
windData_Feb_2022 = 'data/ERA5_Wind3H_Feb_2022.nc'
windData_Mar_2022 = 'data/ERA5_Wind3H_Mar_2022.nc'


dataList = [{'fileLocation': windData_Jan_2022, 'month': '01', 'day': ['30', '31']},
            {'fileLocation': windData_Feb_2022, 'month': '02', 'day': ['01', '02', '03','04', '05']},
            {'fileLocation': windData_Mar_2022, 'month': '03', 'day': ['01', '02', '03','04']}]

for item in dataList:
    c.retrieve(
    'reanalysis-era5-single-levels',
    {
        'product_type': 'reanalysis',
        'variable': ['10m_u_component_of_wind', '10m_v_component_of_wind'],
        'year': '2022',
        'month': item['month'],
        'day': item['day'],
        'time': [
            '00:00', '03:00', '06:00',
            '09:00', '12:00', '15:00',
            '18:00', '21:00',
        ],
        'area': [45.95, -7.12, 30.15, 37.25],
        'format': 'netcdf',
    },
    item['fileLocation'])

#Combine Wind datasets into one
windDs = xr.open_mfdataset([windData_Jan_2022, windData_Feb_2022, windData_Mar_2022], combine = 'nested', concat_dim='time')


#Save the wave combined dataset to a new NetCDF4 file
windDs.to_netcdf('data/ERA5_Wind3H_Jan-Mar_2022.nc')

windData = Dataset('data/ERA5_Wind3H_Jan-Mar_2022.nc', 'r+')
waveData = Dataset('data/CMEMS_Wave3H_Jan-Mar_2022.nc', 'r+')

#Run remap.py file for bilinear and conservative interpolation datasets
import remap

windData_BL = Dataset('data/ERA5_Wind3H_Jan-Mar_2022_remapBL.nc', 'r+')

waveData.set_auto_mask(True)

# Extract variables for combined wind/wave dataset
vhm0 = waveData.variables['VHM0']
vmdr = waveData.variables['VMDR']
vtm10 = waveData.variables['VTM10']
u10 = windData_BL.variables['u10']
v10 = windData_BL.variables['v10']


# Define the new variable --> wind speed 
wind_speed = windData_BL.createVariable('wind_speed', np.int16, ('time', 'latitude', 'longitude'))
wind_speed.units = 'm s**-1'
wind_speed.long_name = '10 metre wind speed'

#Calculate the square of u10, v10 and write to u10, v10 variable in netCDF4 file
u10sq = u10[:]**2
v10sq = v10[:]**2

# Calculate wind speed from u,v components 
wind_speed = ma.sqrt(u10sq + v10sq)
wind_speed[:]


# Define the new variable --> wind direction
wind_dir = windData_BL.createVariable('wind_dir', np.int16, ('time', 'latitude', 'longitude'))
wind_dir.units = 'deg'
wind_dir.long_name = '10 metre wind direction'

# Calculate wind direction from u,v components 
wind_dir = (270-np.arctan2(v10[:],u10[:])*180/pi)%360
wind_dir[:]

#convert time dimension to string
nctime = windData_BL.variables['time'][:] # get values
t_unit = windData_BL.variables['time'].units # get unit  "days since 1950-01-01T00:00:00Z"
t_cal = windData_BL.variables['time'].calendar
tvalue = num2date(nctime,units = t_unit,calendar = t_cal)
str_time = [i.strftime("%Y-%m-%d %H:%M:%S") for i in tvalue] # to display dates as string


# Get dimensions assuming 3D: time, latitude, longitude
time_dim, lat_dim, lon_dim = vhm0.get_dims()
time_var = waveData.variables[time_dim.name]
times = num2date(time_var[:], time_var.units)
latitudes = waveData.variables[lat_dim.name][:]
longitudes = waveData.variables[lon_dim.name][:]
 
output_dir = './'

# ==========================================================================
# Write data as a CSV table with 4 columns: time, latitude, longitude, value
# ==========================================================================
filename = os.path.join(output_dir, 'data/CMEMS_ERA5_Jan-Mar2022.csv')
print(f'Writing data in tabular form to {filename} (this may take some time)...')

times_grid, latitudes_grid, longitudes_grid = [
    x.flatten() for x in np.meshgrid(times, latitudes, longitudes, indexing='ij')]
df = pd.DataFrame({
    'id': range(1, 1+len(times_grid)),
    'time': [t.isoformat(sep=" ") for t in times_grid],
    'latitude': latitudes_grid,
    'longitude': longitudes_grid,
    'vhm0': vhm0[:].flatten(),
    'vmdr': vmdr[:].flatten(),
    'vtm10': vtm10[:].flatten(),
    'u10': u10[:].flatten(),
    'v10': v10[:].flatten(),
    'speed':wind_speed[:].flatten(),
    'direction':wind_dir[:].flatten()
})
df.to_csv(filename, index=False)
print('Done')
