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
app.get('/downloadConfiguration', authenticateToken, (req, res) => {
    const email = req.body.email;
    const name = req.body.name;
    const query = "SELECT * FROM configurazioni WHERE email=? AND nome=?"
    db.query(query, [email, name], (err, result) => {
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        if (result.length > 0) {
            return res.send({ data: result[0] });
        } else {
            return res.status(404).send({ message: 'Configurazione non trovata' });
        }
    });
});

app.post('/exportConfiguration', authenticateToken, (req, res) => {
    //TODO:Manda anche gli altri campi tipo option e ps 
    //TODO:Implementa i buttonL1, buttonR1, buttonL2, buttonR2, triggerL2, triggerR2...
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
    const filePath = `./${username}_config.txt`;
    const fileContent = JSON.stringify(data, null, 2);
    fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
            console.error('Errore durante la scrittura del file:', err);
            return res.status(500).json({ message: 'Errore durante la scrittura del file' });
        }
        const query = "INSERT INTO configurazioni (email, nome, descrizione, dataPubblicazione, stato, configurazione, dataCreazione) VALUES(?,?,?,?,?,?,?)";
        const formattedQuery = mysql.format(query, [email, nome, descrizione, new Date(), stato, fileContent, new Date()]);
        console.log(formattedQuery);
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

app.post('/getUserData', authenticateToken, (req, res) => {
    const { username, email } = req.body;
    const query = `SELECT * FROM users WHERE username = ? AND email = ?`;
    const formattedQuery = mysql.format(query, [username, email]);
    console.log(formattedQuery);
    db.query(query, [username, email], (err, result) => {
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        if (result.length > 0) {
            return res.send({ data: result[0] });
        } else {
            return res.status(404).send({ message: 'Utente non trovato' });
        }
    })
})
app.get('/getCommunityConfiguration',(authenticateToken),(req,res)=>{
    const query="SELECT configurazioni.idConfigurazione,configurazioni.nome,configurazioni.descrizione,users.username FROM configurazioni,users WHERE stato='Pubblico' and (configurazioni.email= users.email)";
    console.log(query);
    db.query(query,(err,result)=>{
        if(err){
            console.error('Errore di database:', err);
            return res.status(500).json({ message: 'Errore di database' });
        }
        if(result.length>0){
            return res.send({data:result});
        }
        else{
            return res.status(404).send({message:'Configurazioni non trovate'});
        }
    })
})
app.post('/deleteConfiguration', (req, res) => {
    //const { email, name } = req.body;
    const email=req.body.email;
    const nome= req.body.nome;
    console.log({email,nome})
  
    const query = "DELETE FROM configurazioni WHERE email = ? AND nome = ?";
    const formattedQuery = mysql.format(query, [email, nome]);
    console.log(formattedQuery);
  
    db.query(query, [email, nome], (err, result) => {
      if (err) {
        console.error('Errore di database:', err);
        return res.status(500).json({ message: 'Errore di database' });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Configurazione non trovata' });
      }
  
      res.status(200).json({ message: 'Configurazione eliminata con successo' });
    });
  });

app.put('/shareConfiguration',authenticateToken ,(req, res) => {
    const {email,nome}=req.body;
    console.log(req.body);
    const query= "UPDATE configurazioni SET stato='Pubblico' WHERE email=? and nome=?"
    const formattedQuery=mysql.format(query,[email,nome]);
    console.log(formattedQuery);
    db.query(query,[email,nome],(err,result)=>{
        if(err){
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        if(result.affectedRows>0){
            return res.send({message:'Configurazione pubblicata con successo!'});
        }
        else{
            return res.status(404).send({message:'Configurazione non trovata'});
        }
    })
})
app.put('/privateConfiguration', authenticateToken, (req, res) => {
    const {email,name}=req.body;
    console.log(req.body);
    const query= "UPDATE configurazioni SET stato='Privato' WHERE email=? and nome=?"
    const formattedQuery=mysql.format(query,[email,name]);
    console.log(formattedQuery);
    db.query(query,[email,name],(err,result)=>{
        if(err){
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        if(result.affectedRows>0){
            return res.send({message:'Configurazione pubblicata con successo!'});
        }
        else{
            return res.status(404).send({message:'Configurazione non trovata'});
        }
    })
})

app.post('/getConfigurations', authenticateToken, (req, res) => {
    const email=req.body.email;
    const query= "SELECT * FROM `configurazioni` WHERE email=?"    
    const formattedQuery=mysql.format(query,[email]);
    console.log(formattedQuery);
    db.query(query,[email],(err,result)=>{
        if(err){
            console.error('Errore di database:', err);
            return res.status(500).send({ message: 'Errore di database' });
        }
        if(result.length>0){
            return res.send({data:result});
        }
        else{
            return res.status(404).send({message:'Configurazioni non trovate'});
        }
    })
});

app.post('/downloadConfiguration', authenticateToken, (req, res) => {
    const {idConfigurazione,name} = req.body;
    
    console.log(req.body);
    const query = "SELECT configurazione,username FROM configurazioni,users WHERE idConfigurazione = '? and name=?' and (configurazione.email=users.email)";
    const formattedQuery = mysql.format(query, [idConfigurazione]);
    console.log(formattedQuery);
    db.query(query, [idConfigurazione,name], (err, result) => {
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).json({ message: 'Errore di database' });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'Configurazione non trovata' });
        }
        const configuration = result[0].configurazione;
        const filePath = `./${name}_config.json`;
        fs.writeFile(filePath, configuration, (err) => {
            if (err) {
                console.error('Errore durante la scrittura del file:', err);
                return res.status(500).json({ message: 'Errore durante la scrittura del file' });
            }
            res.download(filePath, `${name}_config.json`, (err) => {
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
});
app.post('/downloadConfigurationProfile', authenticateToken, (req, res) => {
    const {email,name} = req.body;
    
    console.log(req.body);
    const query = "SELECT configurazione FROM configurazioni WHERE nome = ? and email=?";
    const formattedQuery = mysql.format(query, [name,email]);
    console.log(formattedQuery);
    db.query(query, [name,email], (err, result) => {
        if (err) {
            console.error('Errore di database:', err);
            return res.status(500).json({ message: 'Errore di database' });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'Configurazione non trovata' });
        }
        const configuration = result[0].configurazione;
        const filePath = `./${name}_config.json`;
        fs.writeFile(filePath, configuration, (err) => {
            if (err) {
                console.error('Errore durante la scrittura del file:', err);
                return res.status(500).json({ message: 'Errore durante la scrittura del file' });
            }
            res.download(filePath, `${name}_config.json`, (err) => {
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
});


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
app.post('/registerAdmin', (req, res) => {
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

app.post('/loginAdmin', (req, res) => {
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

app.delete('/deleteAdmin', authenticateToken, (req, res) => {
    const username = req.body.username;
    const query = `DELETE FROM admins WHERE username = ?`
    db.query(query, username, (err, result) => {
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

app.put("/modifyAdmin", authenticateToken, (ris, req) => {
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
                res.send({ message: "Modifica completata con successo!" },);
            }
        })
    }
});

app.delete('/deleteUser', authenticateToken, (req, res) => {
    const username = req.body.username;
    const query = `DELETE FROM users WHERE username = ?`
    db.query(query, username, (err, result) => {
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
                email: user.email,
                token
            });
        } else {
            return res.status(401).send({ message: 'Credenziali errate' });
        }
    });
});

app.put('/modifyUser', authenticateToken, async (req, res) => {
    const { email, username, password, birthDate, gender, nome,cognome,emailAttuale } = req.body;
    console.log({ email, username, password, birthDate, gender, nome,cognome,emailAttuale });
    const sql = `UPDATE users SET email = ?, username = ?, password = ?, dataNascita = ?, sesso = ? , nome = ?, cognome = ? WHERE email = ?;`;
    const values = [email, username, password, birthDate, gender,nome,cognome,emailAttuale];
    const formattedQuery = mysql.format(sql, values);
    console.log(formattedQuery)
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Errore nell'aggiornamento:", err);
            res.status(500).send("Errore del server");
        } else {
            res.send("Aggiornamento riuscito");
        }
    });


});

app.post('/registerUser', async (req, res) => {
    const email = req.body.email;
    const username = req.body.username;
    const password = req.body.password;
    const dataNascita = req.body.birthDate;
    const sesso = req.body.gender;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log({ email, username, hashedPassword, dataNascita, sesso, firstName, lastName });
    const query = "INSERT INTO users(email, username, password, dataNascita, sesso, nome,cognome) VALUES(?,?,?,?,?,?,?)";
    const formattedQuery = mysql.format(query, [email, username, hashedPassword, dataNascita, sesso, firstName, lastName]);

    console.log(`Query formattata: ${formattedQuery}`);
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

app.get('/lesson', (req, res) => {
    const query = "SELECT * FROM lezioni";
    console.log(query)
    db.query(query, (err, data) => {
        if (err) {
            console.error('Errore durante la query:', err);
            return res.status(500).json(err);
        }
        return res.json(data);
    });
});

app.put('/modifyLesson', authenticateToken, (req, res) => {
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

app.post('/addLesson', authenticateToken, (req, res) => {
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

app.delete('/deleteLesson', authenticateToken, (req, res) => {
    //TODO: 
});

// Gestione della connessione al database
db.connect(err => {
    if (err) {
        console.error('Errore di connessione al DB:', err);
    }
});