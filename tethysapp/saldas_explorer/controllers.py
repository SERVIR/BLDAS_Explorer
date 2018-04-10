from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from tethys_sdk.gizmos import Button
import datetime
import json
from django.http import JsonResponse
from .utils import *

def home(request):
    """
    Controller for the app home page.
    """
    dekad_options = []
    month_options = []

    for i in range(2,37):
        dekad = format(i,"02d")
        option = [dekad,'Dekad '+str(i)]
        dekad_options.append(option)

    for i in range(1, 13):
        month_options.append([datetime.date(2017, i, 1).strftime('%m'), datetime.date(2017, i, 1).strftime('%B')])


    context = {
        'dekad_options':json.dumps(dekad_options),
        'month_options':json.dumps(month_options),
    }

    return render(request, 'saldas_explorer/home.html', context)

def get_plot(request):
    return_obj = {}

    if request.is_ajax() and request.method == 'POST':
        info = request.POST

        variable = info.get("variable")

        return_obj["variable"] = variable

        point = request.POST['point']
        polygon = request.POST['polygon']

        if point:
            print('Its a point')
            ts = get_pt_ts(variable,point)
            return_obj["time_series"] = ts
            return_obj["interaction"] = "point"
            return_obj["success"] = "success"

        if polygon:
            print('its a polygon')
            return_obj["interaction"] = "polygon"
            return_obj["success"] = "success"

    return JsonResponse(return_obj)