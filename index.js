const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const fs = require('fs');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
// require('dotenv').config(); // Per usare le variabili d'ambiente
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || 'chiaveSuperSegreta'; 
app.use(cors()); 
app.use(express.json());

const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        console.log("Manca")
        return res.status(401).send({ message: 'Accesso negato, token mancante' });
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.status(403).send({ message: 'Token non valido' });
        }
        req.user = user;
        next();
    });
};

app.post('/exportConfiguration',authenticateToken ,(req, res) => {
    //TODO:Manda anche gli altri campi tipo option e ps 
    //FIXME:Implementa i buttonL1, buttonR1, buttonL2, buttonR2, triggerL2, triggerR2...
    const {
        buttonCross,
        buttonCircle,
        buttonSquare,
        buttonTriangle,
        // buttonL1,
        // buttonR1,
        // buttonL2,
        // buttonR2,
        // triggerL2,
        // triggerR2,
        username,
        email,
        nome,
        descrizione,
        stato
    } = req.body;
    const data = {
        buttonCross,
        buttonCircle,
        buttonSquare,
        buttonTriangle,
        username,
        email,
        nome,
        descrizione,
        stato
        // buttonL1,
        // buttonR1,
        // buttonL2,
        // buttonR2,
        // triggerL2,
        // triggerR2,
    };


    console.log("Dati ricevuti:", data);

    // Scrivi i dati su un file di testo
    const filePath = `./${username}_config.txt`;
    const fileContent = JSON.stringify(data, null, 2);
    fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
            console.error('Errore durante la scrittura del file:', err);
            return res.status(500).json({ message: 'Errore durante la scrittura del file' });
        }
        const query = "INSERT INTO configurazioni (email, nome, descrizione, dataPubblicazione, stato, configurazione, dataCreazione) VALUES(?,?,?,?,?,?,?)";
        const values = [email, nome, descrizione, new Date(), stato, fileContent, new Date()];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Errore di database:', err);
                return res.status(500).json({ message: 'Errore di database' });
            }
        });
        res.download(filePath, `${username}_config.txt`, (err) => {
            if (err) {
                console.error('Errore durante l\'invio del file:', err);
                return res.status(500).json({ message: 'Errore durante l\'invio del file' });
            }
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Errore durante l\'eliminazione del file:', err);
                }
            });
        });
    });
});

app.delete('/deleteConfiguration',authenticateToken,(req,res)=>{

})

app.put('/shareConfiguration',authenticateToken,(req,res)=>{

})
app.put('/privateConfiguration',authenticateToken,(req,res)=>{

})

//Importa configurazioni è lato client


app.listen(port, () => {
    console.log(`Server in esecuzione su http://localhost:${port}`);
});
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pcp'
});

function testRegex(email) {
    const domainRegex = /@(studenti\.uniba\.it|uniba\.it|gmail\.com|yahoo\.com|icloud\.com)$/;
    return domainRegex.test(email);
}
app.post('/registerAdmin',authenticateToken, (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const username = req.body.username;
    const query = "INSERT INTO admins(email,username,password) VALUES(?,?,?)";
    db.query(query, [email, username, password], (err, result) => {
        if (err) {
            console.error('Errore di database:', err);
            return result.status(500).send({ message: 'Errore di database' });
        }
        else {
            res.send({ message: "Registrazione completata con successo!" });
        }
    }
    )
});

app.post('/loginAdmin',authenticateToken, (req, res) => {
    const usmail = req.body.usmail;
    const password = req.body.password;
    const isEmail = domainRegex.test(usmail);
    const query = `SELECT * FROM admins WHERE ${isEmail ? 'email' : 'username'} = ? AND password = ?`;
    db.query(query, [usmail, password], (err, results) => {
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        
        if (results.length > 0) {
            return res.send({ message: 'Login effettuato con successo!', user: results[0] });
        } else {
            return res.status(401).send({ message: 'Credenziali errate' });
        }
    });
});

app.delete('/deleteAdmin',authenticateToken,(req,res)=>{
    const username= req.body.username;
    const query=`DELETE FROM admins WHERE username = ?`
    db.query(query,username,(err,result)=>{
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        if (result.affectedRows > 0) {
            console.log('Admin eliminato con successo:', result);
            return res.send({ message: 'Admin eliminato con successo!' });
        } else {
            console.log('Admin non trovato');
            return res.status(404).send({ message: 'Admin non trovato' });
        }
    })
});

app.put("/modifyAdmin",authenticateToken, (ris, req) => {
    const {
        emailAttuale,
        email,
        password
    } = req.body;
    console.log({ email, emailAttuale, password });
    if (email) {
        const query = "UPDATE admins SET email=? WHERE email=?"
        db.query(query, [email, emailAttuale], (err, result) => {
            if (err) {
                console.error('Errore di database:', err);
                return res.status(500).send({ message: 'Errore di database' });
            } else {
                res.send({ message: "Modifica completata con successo!" });
            }
        })
    }
    else if (password) {
        const query = "UPDATE admins SET password=? WHERE email=?";
        db.query(query, [password, emailAttuale], (err, result) => {
            if (err) {
                console.error('Errore di database:', err);
                return res.status(500).send({ message: 'Errore di database' });
            } else {
                res.send({ message: "Modifica completata con successo!" });
            }
        })
    }
});

app.delete('/deleteUser',authenticateToken,(req,res)=>{
    const username= req.body.username;
    const query=`DELETE FROM users WHERE username = ?`
    db.query(query,username,(err,result)=>{
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        if (result.affectedRows > 0) {
            console.log('Admin eliminato con successo:', result);
            return res.send({ message: 'Admin eliminato con successo!' });
        } else {
            console.log('Admin non trovato');
            return res.status(404).send({ message: 'Admin non trovato' });
        }
    })
})

app.post('/loginUser', (req, res) => {
    const usmail = req.body.usmail;
    const password = req.body.password;
    const isEmail = testRegex(usmail);

    const query = `SELECT * FROM users WHERE ${isEmail ? 'email' : 'username'} = ? AND password = ?`;
    db.query(query, [usmail, password], (err, results) => {
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }

        if (results.length > 0) {
            const user = results[0];
            const token = jwt.sign(
                { id: user.id, email: user.email, username: user.username }, 
                secretKey, 
                { expiresIn: '1h' } // Token valido per 1 ora
            );
            return res.send({ 
                message: 'Login effettuato con successo!', 
                username: user.username,
                token 
            });
        } else {
            return res.status(401).send({ message: 'Credenziali errate' });
        }
    });
});

app.put('/modifyUser',authenticateToken, async (req, res) => {
    const { email, username, password, dataNascita, sesso, emailAttuale } = req.body;
    if (email) {
        const query = `UPDATE users SET email = ? WHERE email = ?`;
        const formattedQuery = mysql.format(query, [email, emailAttuale]);
        console.log(`Query formattata: ${formattedQuery}`);
        db.query(query, [email, emailAttuale], (err, result) => {
            if (err) {
                console.error('Errore di database:', err);
                return res.status(500).send({ message: 'Errore di database' });
            } else {
                res.send({ message: "Modifica completata con successo!" });
            }
        });
    } else if (username) {
        const query = `UPDATE users SET username = ? WHERE email = ?`;
        const formattedQuery = mysql.format(query, [username, emailAttuale]);
        console.log(`Query formattata: ${formattedQuery}`);
        db.query(query, [username, emailAttuale], (err, result) => {
            if (err) {
                console.error('Errore di database:', err);
                return res.status(500).send({ message: 'Errore di database' });
            } else {
                res.send({ message: "Modifica completata con successo!" });
            }
        });
    } else if (password) {
        // Hasha la password prima di salvarla nel database
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `UPDATE users SET password = ? WHERE email = ?`;
        const formattedQuery = mysql.format(query, [hashedPassword, emailAttuale]);
        console.log(`Query formattata: ${formattedQuery}`);
        db.query(query, [hashedPassword, emailAttuale], (err, result) => {
            if (err) {
                console.error('Errore di database:', err);
                return res.status(500).send({ message: 'Errore di database' });
            } else {
                res.send({ message: "Modifica completata con successo!" });
            }
        });
    } else if (dataNascita) {
        const query = `UPDATE users SET dataNascita = ? WHERE email = ?`;
        const formattedQuery = mysql.format(query, [dataNascita, emailAttuale]);
        console.log(`Query formattata: ${formattedQuery}`);
        db.query(query, [dataNascita, emailAttuale], (err, result) => {
            if (err) {
                console.error('Errore di database:', err);
                return res.status(500).send({ message: 'Errore di database' });
            } else {
                res.send({ message: "Modifica completata con successo!" });
            }
        });
    } else if (sesso) {
        const query = `UPDATE users SET sesso = ? WHERE email = ?`;
        // const formattedQuery = mysql.format(query, [sesso, emailAttuale]);
        // console.log(`Query formattata: ${formattedQuery}`);
        db.query(query, [sesso, emailAttuale], (err, result) => {
            if (err) {
                console.error('Errore di database:', err);
                return res.status(500).send({ message: 'Errore di database' });
            } else {
                res.send({ message: "Modifica completata con successo!" });
            }
        });
    } else {
        res.status(400).send({ message: 'Nessun campo valido fornito per l\'aggiornamento' });
    }
});

app.post('/registerUser', async (req, res) => {
    const email = req.body.email;
    const username = req.body.username;
    const password = req.body.password;
    const dataNascita = req.body.dataNascita;
    const sesso = req.body.sesso;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log({ email, username, hashedPassword, dataNascita, sesso, firstName, lastName });
    const query = "INSERT INTO users(email, username, password, dataNascita, sesso, firstName,lastName) VALUES(?,?,?,?,?,?,?)";
    db.query(query, [email, username, hashedPassword, dataNascita, sesso, firstName, lastName], (err, results) => {
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        if (results.affectedRows > 0) {
            return res.send({ message: 'Registrazione completata con successo!' });
        } else {
            return res.status(400).send({ message: 'Errore di registrazione' });
        }
    });
});

app.get('/lesson',authenticateToken, (req, res) => {
    const query = "SELECT * FROM lezioni";
    db.query(query, (err, data) => {
        if (err) {
            console.error('Errore durante la query:', err);
            return res.status(500).json(err);
        }
        return res.json(data);
    });
});

app.put('/modifyLesson',authenticateToken, (req, res) => {
    const nomeLezione = req.body.nomeLezione;
    const testoLezione = req.body.testoLezione;
    const lezioneSelezionata = req.body.lezioneSelezionata;
    let query = `UPDATE lezioni SET `;
    if (nomeLezione) {
        query += `nomeLezione='${nomeLezione}'`;
    }
    if (testoLezione) {
        query += `,testoLezione='${testoLezione}' WHERE nomeLezione='${lezioneSelezionata}'`;
    }
    else {
        query += `WHERE nomeLezione='${lezioneSelezionata}'`;
    }
    console.log(query);
    db.query(query, (err, result) => {
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        else {
            res.send({ message: "Lezione modificata con successo!" });
        }
    });
});

app.post('/addLesson',authenticateToken, (req, res) => {
    const nomeLezione = req.body.nomeLezione;
    const testoLezione = req.body.testoLezione;
    const query = "INSERT INTO lezioni(testoLezione,nomeLezione) VALUES(?,?)";
    db.query(query, [testoLezione, nomeLezione], (err, result) => {
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        else {
            res.send({ message: "Lezione aggiunta con successo!" });
        }
    });
});

app.delete('/deleteLesson',authenticateToken,(req,res)=>{
    //TODO: 
});



// Gestione della connessione al database
db.connect(err => {
    if (err) {
        console.error('Errore di connessione al DB:', err);
    } else {
        console.log('Connesso al DB');
    }
});