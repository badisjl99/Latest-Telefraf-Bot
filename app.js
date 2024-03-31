require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const port = process.env.PORT || 6782;
const app = express();

app.use(cors());

const mongoURI = process.env.MONGO_URL;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));


const bot = new Telegraf(process.env.BOT_TOKEN);

const actorSchema = new mongoose.Schema({
    role: String,
    name: String
  });
  
  const downloadSchema = new mongoose.Schema({
    link: String,
    quality: String
  });
  
  const movieSchema = new mongoose.Schema({
    rating: String,
    genres: [String],
    title: String,
    url: String,
    imageUrl: String,
    trailerLink: String,
    summary: String,
    directors: [String],
    actors: [actorSchema],
    year: String,
    download: [downloadSchema]
  });

const Movie = mongoose.model('Movie', movieSchema);


bot.help(ctx => {
    const helpMessage = `
    Welcome to the Movie Bot!
    
    Available commands:
    /start - Start the bot
    /random_movie - Get a random movie recommendation
    /help - Show this help message
    `;
    ctx.reply(helpMessage);
});



app.get('/randommovie', async (req, res) => {
    try {
      const randomMovie = await Movie.aggregate([
        { $match: { 
            rating: { $gte: "7" }, 
            year: { $gte: "2005" }
          } 
        },
        { $sample: { size: 1 } } 
      ]);
  
      if (randomMovie.length === 0) {
        return res.status(404).json({ message: "No movies found matching the criteria." });
      }
  
      const { title, summary, rating, year, genres, download, imageUrl } = randomMovie[0];
  
      const movieData = {
        title,
        summary,
        rating,
        year,
        genres,
        download,
        imageUrl
      };
  
      res.json(movieData);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
});





app.use(bot.webhookCallback('/bot')); 

bot.command('watch', async (ctx) => {
    try {
        const url = 'https://stream-server-p1jp.onrender.com/';
        const button = Markup.urlButton('Go to URL', url);
        
        ctx.reply('Click the button below to be redirected:', Markup.inlineKeyboard([button]));
    } catch (error) {
        ctx.reply('An error occurred while processing your request.');
        console.error(error);
    }
});

bot.start(ctx => {
    const description = `🎬 Welcome to the Movie Bot! 🍿\n\n`;
    const aboutBot = `Our bot has access to a collection of over 65,000 movies! 🌟\n\n`;
    const usage = `To get started, simply use the /random_movie command to get a random movie recommendation. 🎥\n\n`;
    const help = `You can also use the /help command to see all available commands and how to use them. ℹ️\n\n`;
    const message = description + aboutBot + usage + help;

    ctx.reply(message);
});
bot.command('random_movie', async (ctx) => {
    try {
        const response = await axios.get('https://latest-telefraf-bot.onrender.com/randommovie');
        const data = response.data;

        const { title, year,summary, rating, genres, download, imageUrl } = data;

        let caption = `<b>         ${title}</b>\n\n`;
        caption += `<i><b>Summary:</b></i> ${summary}\n\n`;

        caption += `<i>Year:</i> <b>${year}</b>\n`;
        caption += `<i>Rating:</i> <b>${rating}</b>\n`;
        caption += `<i>Genres:</i> <b>${genres.join(', ')}</b>\n`;

        const inlineKeyboard = download.map(linkObj => ({
            text: linkObj.quality,
            url: linkObj.link
        }));

        ctx.replyWithPhoto({ url: imageUrl }, { caption, parse_mode: 'HTML', reply_markup: { inline_keyboard: [inlineKeyboard] } });
    } catch (error) {
        ctx.reply('An error occurred while processing your request.');
        console.error(error);
    }
});

    
bot.on('text', ctx => {
    ctx.reply('How can I help?');
  })

bot.launch().then(() => console.log('Telegraf bot started'));





app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
