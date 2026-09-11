# Youth Sports Finder

## Product Goal

Help parents find youth sports clubs near them.

Users choose a sport and see relevant clubs on an interactive map. The clubs shown should correspond to the geographic area currently visible on the map.

As the user zooms out and the visible geographic area becomes larger, more clubs can become visible.

## Initial User Journey

1. User opens the application.
2. The application attempts to obtain the user's current location.
3. User selects a sport.
4. The map centers near the user's location.
5. Relevant youth sports clubs appear as markers.
6. User can pan and zoom the map.
7. Clubs inside the visible map area are shown.
8. User can select a marker to see basic club information.

## Initial MVP

The first MVP supports only:

* Basketball
* Browser geolocation
* Interactive map
* Club markers
* Map pan and zoom
* Club details popup
* Local fixture data

## Club Information

A club can contain:

* id
* name
* sport
* latitude
* longitude
* address
* juniorProgram
* website

## Important Product Distinction

A basketball court or general sports centre is not necessarily a youth basketball club.

The long-term product should prefer organisations that actually operate junior or youth programs.

For the initial MVP this distinction is represented by fixture data rather than discovered from an external service.

## Not Yet In Scope

* Real club search APIs
* Backend services
* Database
* User accounts
* Favourites
* Route planning
* Multiple sports
* Payments
* AI-based club discovery
* Production deployment

## Future Direction

After the core map experience works, investigate real data sources and create a provider layer capable of searching clubs within the current map viewport.
