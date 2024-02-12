
const express = require('express');
const csv = require('csv-parser');
const fs = require('fs');
const mysql = require('mysql');
const path=require('path')
const expresshbs = require('express-handlebars');
const bodyParser = require('body-parser');



const app = express();
const PORT = 3000;

// Configuration de Handlebars
app.engine('hbs', expresshbs.engine({extname:'.hbs',defaultLayout:'dettes',layoutsDir: __dirname + '/views/',helpers: {
  formatMontant: function(montant) {
      return montant.toFixed(2);
  }
}}));
app.set('view engine', 'hbs');
app.set('views', 'views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,'assets')));
app.use(express.static('public'));



app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));

});

/*app.get('/payement', (req, res) => {
  res.sendFile(__dirname + '/dettes');
});*/

app.get('/emprunter', (req, res) => {
  res.sendFile(__dirname + '/emprunter.html');
});






// Configuration de la connexion à la base de données MySQL
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'projetdb'
});



// Lecture du fichier CSV
fs.readFile('fichier.csv', 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }

    // Agrégation des dettes
    const dettes = {};
    const lines = data.split('\n');
    lines.forEach(line => {
        const [debiteur, crediteur, montant] = line.split(',');
        const key = debiteur + '-' + crediteur;
        dettes[key] = (dettes[key] || 0) + parseFloat(montant);
    });

    
   // Stockage des dettes agrégées dans MySQL
connection.connect(err => {
  if (err) {
      console.error('Erreur de connexion à la base de données :', err);
      return;
  }
  
  for (const [key, value] of Object.entries(dettes)) {
      const [debiteur, crediteur] = key.split('-');
      const montant = value.toFixed(2);
      const sql = `INSERT INTO dettes (debiteur, crediteur, montant) VALUES ('${debiteur}', '${crediteur}', ${montant})`;
      connection.query(sql, (err, result) => {
          if (err) {
              console.error('Erreur lors de l\'insertion des données :', err);
              return;
          }
          console.log('Données insérées avec succès dans MySQL.');
      });
  }
  
});

});
app.post('/ajouter', (req, res) => {
  const { debiteur, crediteur, montant } = req.body;
  const ligne = `\n${debiteur},${crediteur},${montant}\n`;

  // Ajout des données au fichier CSV
  fs.appendFile('fichier.csv', ligne, (err) => {
      if (err) {
          console.error('Erreur lors de l\'ajout des données au fichier CSV :', err);
          res.status(500).send('Erreur lors de l\'ajout des données.');
      } else {
          console.log('Données ajoutées avec succès au fichier CSV.');

          // Redirection vers la page d'accueil après l'ajout des données
          res.send('Dette ajoutée avec succès.');
      }
  });
});

// Middleware pour afficher les dettes résumées dans une page HTML
app.get('/payement', (req, res) => {
  
    const sql='SELECT DISTINCT debiteur, crediteur, montant FROM dettes'; connection.query(sql, (error, results, fields) => {
    if (error) {
        console.error('Erreur lors de la récupération des dettes depuis MySQL :', error);
        return res.status(500).send('Erreur serveur');
    }
    
  
    // Rendre la vue et passer les dettes comme contexte
    res.render('dettes', { dettes: results });
});

});
app.get('/payement', (req, res) => {
  res.render('dettes', { title: 'Tableau de bord' });
});

app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
