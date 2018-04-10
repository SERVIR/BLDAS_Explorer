import datetime
import time,calendar
import sys
import os, shutil
from ftplib import FTP
import numpy as np
from itertools import groupby
import tempfile, shutil,sys
import calendar
from netCDF4 import Dataset
import gdal
import osr
import ogr
import requests
from config import SALDAS_DIR
import rasterio
import random


def get_pt_ts(variable,point):
    coords = point.split(',')
    lat = round(float(coords[1]), 2)
    lon = round(float(coords[0]), 2)
    input_dir = SALDAS_DIR
    print(variable)
    ts_plot = []

    for dir in sorted(os.listdir(input_dir)):
        cur_dir = os.path.join(input_dir,dir)
        for file in sorted(os.listdir(cur_dir)):
            if 'HIST' in file:
                file_ls = str(file.split('.')[0]).split('_')[2][:-4]
                dt = datetime.datetime.strptime(file_ls, '%Y%m%d')
                time_stamp = time.mktime(dt.timetuple()) * 1000
                in_loc = os.path.join(cur_dir, file)
                lis_fid = Dataset(in_loc, 'r')  # Reading the netcdf file
                lis_var = lis_fid.variables  # Get the netCDF variables
                lats = lis_var['lat'][:]
                lons = lis_var['lon'][:]

                abslat = np.abs(lats - lat)
                abslon = np.abs(lons - lon)

                c = np.maximum(abslon, abslat)

                x, y = np.where(c == np.min(c))
                if variable == 'SoilMoist_tavg':
                    val = lis_var[variable][0,x[0],y[0]]
                else:
                    val = lis_var[variable][x[0],y[0]]
                ts_plot.append([time_stamp, float(val)])
                # print(time_stamp,val)
                ts_plot.sort()

    return ts_plot

# get_pt_ts('Tair_f_tavg','91.1,20.7')

def get_variables_meta():
    db_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'public/data/var_info.txt')
    variable_list = []
    with open(db_file, mode='r') as f:
        f.readline()  # Skip first line

        lines = f.readlines()

    for line in lines:
        if line != '':
            line = line.strip()
            linevals = line.split('|')
            variable_id = linevals[0]
            display_name = linevals[1]
            units = linevals[2]
            gs_id = linevals[3]
            start = linevals[4]
            end = linevals[5]
            vmin = linevals[6]
            vmax = linevals[7]
            scale = calc_color_range(int(vmin),int(vmax))
            variable_list.append({
                'id': variable_id,
                'display_name': display_name,
                'units': units,
                'gs_id': gs_id,
                'start':start,
                'end':end,
                'min':vmin,
                'max':vmax,
                'scale':scale
            })

    return variable_list

def calc_color_range(min,max):

    interval = abs((max - min) / 20)

    if interval == 0:
        scale = [0] * 20
    else:
        scale = np.arange(min, max, interval).tolist()

    return scale

