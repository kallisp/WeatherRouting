
import os
from netCDF4 import Dataset
from netCDF4 import num2date
import numpy as np
from datetime import datetime, time
import pandas as pd


os.environ['HDF5_USE_FILE_LOCKING'] = 'FALSE'

#Interpolate Wind dataset to Wave dataset to create a single dataset with same spatial resolution (coarser to finer grid --> 0.083x0.083 deg)
from cdo import *
cdo = Cdo()

source_grid = 'data/ERA5_Wind3H_Jan-Mar_2022.nc'
target_grid = 'data/CMEMS_Wave3H_Jan-Mar_2022.nc'

#Bilinear interpolation
cdo.remapbil(target_grid, input=source_grid, output="data/ERA5_Wind3H_Jan-Mar_2022_remapBL.nc")


#Interpolate Wave dataset to a new dataset with lower spatial resolution for visualization purposes (Wave Direction Arrow map) (finer to coarser grid --> 0.5x0.5 deg)
source = 'data/CMEMS_Wave3H_Jan-Mar_2022.nc'
target = 'data/gridspec.txt'

#1st order Conservative interpolation
cdo.remapcon(target, input=source, output='data/CMEMS_WaveDir_Jan-Mar2022_remapCON.nc') 


waveDirData = Dataset('data/CMEMS_WaveDir_Jan-Mar2022_remapCON.nc', 'r+')


# Extract variables for wave direction remapped dataset
vmdr = waveDirData.variables['VMDR']


# Get dimensions assuming 3D: time, latitude, longitude
time_dim, lat_dim, lon_dim = vmdr.get_dims()
time_var = waveDirData.variables[time_dim.name]
times = num2date(time_var[:], time_var.units)
latitudes = waveDirData.variables[lat_dim.name][:]
longitudes = waveDirData.variables[lon_dim.name][:]
 
output_dir = './'

# ==========================================================================
# Write data as a CSV table with 4 columns: time, latitude, longitude, value
# ==========================================================================
filename = os.path.join(output_dir, 'data/CMEMS_WaveDir_Jan-Mar2022_remapCON.csv')
print(f'Writing data in tabular form to {filename} (this may take some time)...')

times_grid, latitudes_grid, longitudes_grid = [
    x.flatten() for x in np.meshgrid(times, latitudes, longitudes, indexing='ij')]
df = pd.DataFrame({
    'id': range(1, 1+len(times_grid)),
    'time': [t.isoformat(sep=" ") for t in times_grid],
    'latitude': latitudes_grid,
    'longitude': longitudes_grid,
    'vmdr': vmdr[:].flatten()
    })
df.to_csv(filename, index=False)
print('Done')

