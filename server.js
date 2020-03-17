/***********************
  Load Components!

  Express      - A Node.js Framework
  Body-Parser  - A tool to help use parse the data in a post request
  Pg-Promise   - A database tool to help use connect to our PostgreSQL database
***********************/
var express = require('express'); //Ensure our express framework has been added
var app = express();
var bodyParser = require('body-parser'); //Ensure our body-parser tool has been added
app.use(bodyParser.json());              // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

//Create Database Connection
var pgp = require('pg-promise')();

/**********************
  Database Connection information
  host: This defines the ip address of the server hosting our database.  We'll be using localhost and run our database on our local machine (i.e. can't be access via the Internet)
  port: This defines what port we can expect to communicate to our database.  We'll use 5432 to talk with PostgreSQL
  database: This is the name of our specific database.  From our previous lab, we created the football_db database, which holds our football data tables
  user: This should be left as postgres, the default user account created when PostgreSQL was installed
  password: This the password for accessing the database.  You'll need to set a password USING THE PSQL TERMINAL THIS IS NOT A PASSWORD FOR POSTGRES USER ACCOUNT IN LINUX!
**********************/
const dbConfig = {
	host: 'localhost',
	port: 5433,
	database: 'football_db',
	user: 'umar',
	password: 'HalaMadridYNadaMas'
};

var db = pgp(dbConfig);

// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/'));//This line is necessary for us to use relative paths and access our resources directory



/*********************************
 Below we'll add the get & post requests which will handle:
   - Database access
   - Parse parameters from get (URL) and post (data package)
   - Render Views - This will decide where the user will go after the get/post request has been processed

 Web Page Requests:

  Login Page:        Provided For your (can ignore this page)
  Registration Page: Provided For your (can ignore this page)
  Home Page:
  		/home - get request (no parameters) 
  				This route will make a single query to the favorite_colors table to retrieve all of the rows of colors
  				This data will be passed to the home view (pages/home)

  		/home/pick_color - post request (color_message)
  				This route will be used for reading in a post request from the user which provides the color message for the default color.
  				We'll be "hard-coding" this to only work with the Default Color Button, which will pass in a color of #FFFFFF (white).
  				The parameter, color_message, will tell us what message to display for our default color selection.
  				This route will then render the home page's view (pages/home)

  		/home/pick_color - get request (color)
  				This route will read in a get request which provides the color (in hex) that the user has selected from the home page.
  				Next, it will need to handle multiple postgres queries which will:
  					1. Retrieve all of the color options from the favorite_colors table (same as /home)
  					2. Retrieve the specific color message for the chosen color
  				The results for these combined queries will then be passed to the home view (pages/home)

  		/team_stats - get request (no parameters)
  			This route will require no parameters.  It will require 3 postgres queries which will:
  				1. Retrieve all of the football games in the Fall 2018 Season
  				2. Count the number of winning games in the Fall 2018 Season
  				3. Count the number of lossing games in the Fall 2018 Season
  			The three query results will then be passed onto the team_stats view (pages/team_stats).
  			The team_stats view will display all fo the football games for the season, show who won each game, 
  			and show the total number of wins/losses for the season.

  		/player_info - get request (no parameters)
  			This route will handle a single query to the football_players table which will retrieve the id & name for all of the football players.
  			Next it will pass this result to the player_info view (pages/player_info), which will use the ids & names to populate the select tag for a form 
************************************/

// login page 
app.get('/', function (req, res) {
	res.render('pages/login', {
		local_css: "signin.css",
		my_title: "Login Page"
	});
});

// registration page 
app.get('/register', function (req, res) {
	res.render('pages/register', {
		my_title: "Registration Page"
	});
});

/*Add your other get/post request handlers below here: */
app.get('/home', function (req, res) {
	var query = 'select * from favorite_colors;';
	db.any(query)
		.then(function (rows) {
			res.render('pages/home', {
				my_title: "Home Page",
				data: rows,
				color: '',
				color_msg: ''
			})

		})
		.catch(function (err) {
			// display error message in case an error
			console.log('error', err);
			response.render('pages/home', {
				title: 'Home Page',
				data: '',
				color: '',
				color_msg: ''
			})
		})
});
app.get('/home/pick_color', function (req, res) {
	var color_choice = req.query.color_selection;
	var color_options = 'select * from favorite_colors;';
	var color_message = "select color_msg from favorite_colors where hex_value = '" + color_choice + "';";
	db.task('get-everything', task => {
		return task.batch([
			task.any(color_options),
			task.any(color_message)
		]);
	})
		.then(info => {
			res.render('pages/home', {
				my_title: "Home Page",
				data: info[0],
				color: color_choice,
				color_msg: info[1][0].color_msg
			})
		})
		.catch(err => {
			// display error message in case an error
			console.log('error', err);
			response.render('pages/home', {
				title: 'Home Page',
				data: '',
				color: '',
				color_msg: ''
			})
		});

});

app.post('/home/pick_color', function (req, res) {
	var color_hex = req.body.color_hex;
	var color_name = req.body.color_name;
	var color_message = req.body.color_message;
	var insert_statement = "INSERT INTO favorite_colors(hex_value, name, color_msg) VALUES('" + color_hex + "','" +
		color_name + "','" + color_message + "') ON CONFLICT DO NOTHING;";

	var color_select = 'select * from favorite_colors;';
	db.task('get-everything', task => {
		return task.batch([
			task.any(insert_statement),
			task.any(color_select)
		]);
	})
		.then(info => {
			res.render('pages/home', {
				my_title: "Home Page",
				data: info[1],
				color: color_hex,
				color_msg: color_message
			})
		})
		.catch(err => {
			// display error message in case an error
			console.log('error', err);
			response.render('pages/home', {
				title: 'Home Page',
				data: '',
				color: '',
				color_msg: ''
			})
		});
});
app.get("/team_stats", function (req, res) {
	var query1 = "SELECT * FROM football_games"
	var query2 = "SELECT count(*) FROM football_games WHERE home_score > visitor_score"
	var query3 = "SELECT count(*) FROM football_games WHERE visitor_score > home_score"
	db.task('get-everything', task => {
		return task.batch([
			task.any(query1),
			task.any(query2),
			task.any(query3)
		])
	}).then(data => {
		res.render("pages/team_stats", { my_title: "Team Stats", games: data[0], wins: data[1][0].count, losses: data[2][0].count })

	}).catch(error => {

	})

})

app.get("/player_info", function (req, res) {
	var query = "SELECT id, name from football_players"
	db.any(query).then(rows => {
		rows.forEach(row => {
		});
		res.render("pages/player_info", { my_title: "Player Info", players: rows, Games_Played: 0, Year: 0, Major: 0, Passing_Yards: 0, Avg_Passing_Yards: 0, Rushing_Yards: 0, Avg_Rushing_Yards: 0, Receiving_Yards: 0, Avg_Receiving_Yards: 0 })
	}).catch(error => {
		console.log(error)
	})
})
app.get("/player_info/post", function (req, res) {
	var playerQuery = "SELECT * FROM football_players WHERE name='" + req.query.player_choice + "'"
	var specificPlayerQuery = "SELECT id, name from football_players"
	var averageRushingQuery = "SELECT CAST(rushing_yards as FLOAT)/COUNT(rushing_yards) as average_rushing_yards FROM football_players INNER JOIN football_games ON football_players.id=ANY(football_games.players) WHERE " + "name" + "=" + "'" + req.query.player_choice + "'" + "GROUP by rushing_yards"
	var averagePassingQuery = "SELECT CAST(passing_yards as FLOAT)/COUNT(passing_yards) as average_passing_yards FROM football_players INNER JOIN football_games ON football_players.id=ANY(football_games.players) WHERE " + "name" + "=" + "'" + req.query.player_choice + "'" + "GROUP by passing_yards"
	var averageReceivingQuery = "SELECT CAST(receiving_yards as FLOAT)/COUNT(receiving_yards) as average_receiving_yards FROM football_players INNER JOIN football_games ON football_players.id=ANY(football_games.players) WHERE " + "name" + "=" + "'" + req.query.player_choice + "'" + "GROUP by receiving_yards"
	var gamesPlayedQuery = "SELECT count(players) FROM football_games WHERE(SELECT id FROM football_players WHERE name=" + "'" + req.query.player_choice + "'" + ")=ANY(players)"

	db.task('get-everything', task => {
		return task.batch([
			task.any(playerQuery),
			task.any(specificPlayerQuery),
			task.any(averageRushingQuery),
			task.any(averagePassingQuery),
			task.any(averageReceivingQuery),
			task.any(gamesPlayedQuery)
		])
	}).then(data => {
		res.render("pages/player_info", { my_title: "Player Info", players: data[1], Year: data[0][0].year, Games_Played:data[5][0].count, Major: data[0][0].major, Passing_Yards: data[0][0].passing_yards, Avg_Passing_Yards: data[3][0].average_passing_yards, Rushing_Yards: data[0][0].rushing_yards, Avg_Rushing_Yards: data[2][0].average_rushing_yards, Receiving_Yards: data[0][0].receiving_yards, Avg_Receiving_Yards: data[4][0].average_receiving_yards})

	}).catch(error => {
		console.log(error)
	})

})
app.listen(3000);
console.log('3000 is the magic port');
