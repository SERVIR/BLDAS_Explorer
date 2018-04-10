from tethys_sdk.base import TethysAppBase, url_map_maker


class SaldasExplorer(TethysAppBase):
    """
    Tethys app class for SALDAS Explorer.
    """

    name = 'SALDAS Explorer'
    index = 'saldas_explorer:home'
    icon = 'saldas_explorer/images/icon.gif'
    package = 'saldas_explorer'
    root_url = 'saldas-explorer'
    color = '#d35400'
    description = 'View SALDAS dat'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='saldas-explorer',
                controller='saldas_explorer.controllers.home'
            ),
            UrlMap(
                name='get-plot',
                url='saldas-explorer/get-plot',
                controller='saldas_explorer.controllers.get_plot'
            ),
        )

        return url_maps
