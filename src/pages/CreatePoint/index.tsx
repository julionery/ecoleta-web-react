import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi'
import { Map, TileLayer, Marker } from 'react-leaflet';
import { LeafletMouseEvent } from 'leaflet';
import MaskedInput from 'react-text-mask';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import axios from 'axios';
import api from '../../services/api';

import Dropzone from '../../components/Dropzone';

import './styles.css'

import logo from '../../assets/logo.svg'

// array ou objeto: manualmente informar o tipo da variável

interface Item {
  id: number;
  title: string;
  image_url: string;
}

interface IBGEUFResponse {
  sigla: string;
}

interface IBGECityResponse {
  nome: string;
}

const CreatePoint = () => {

  const [ items, setItems ] = useState<Item[]>([]);
  const [ ufs, setUfs ] = useState<string[]>([]);
  const [ cities, setCities ] = useState<string[]>([]);

  const [initialPosition, setInitialPosition] = useState<[number, number]>([0, 0]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
  });

  const [selectedUf, setSelectedUf] = useState('0');
  const [selectedCity, setSelectedCity] = useState('0');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<[number, number]>([0, 0]);
  const [selectedFile, setSelectedFile] = useState<File>();

  const history = useHistory();

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(position => {
      const  { latitude, longitude } = position.coords;
      setInitialPosition([latitude, longitude]);
    });
  }, []);

  useEffect(() => {
    api.get('items').then(response => {
      setItems(response.data);
    });
  }, []);

  useEffect(() => {
    axios.get<IBGEUFResponse[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome').then(response => {
      const ufInitials = response.data.map( uf => uf.sigla);
      setUfs(ufInitials);
    });
  }, []);
  
  useEffect(() => {
    if(selectedUf === '0'){
      return;
    }
    axios.get<IBGECityResponse[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios`)
      .then(response => {
        const cityNames = response.data.map( city => city.nome);
        setCities(cityNames);
    });
  }, [selectedUf]);

  function handleSelectUf(event: ChangeEvent<HTMLSelectElement>){
    const uf = event.target.value;
    setSelectedUf(uf);
  }

  function handleSelectCity(event: ChangeEvent<HTMLSelectElement>){
    const city = event.target.value;
    setSelectedCity(city);
  }

  function handleMapClick(event: LeafletMouseEvent){
    setSelectedPosition([
      event.latlng.lat,
      event.latlng.lng
    ])
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>){
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  }

  function handleSelectItem(id: number){
    const alreadySelected = selectedItems.findIndex(item => item === id);

    if(alreadySelected >= 0){
      const filteredItems = selectedItems.filter(item => item !== id);
      setSelectedItems(filteredItems);
    }else{
      setSelectedItems([ ...selectedItems, id ]);
    }
  }

  async function handleSubmit(event: FormEvent){
    event.preventDefault();

    const { name, email, whatsapp } = formData;
    const uf = selectedUf;
    const city = selectedCity;
    const [latitude, longitude] = selectedPosition;
    const items = selectedItems;
    const whatsappSend = whatsapp.replace(" ", "").replace("(", "").replace(")", "").replace("-", "").replace(" ", "");
    
    let validation = []
    if(!name.trim()) validation.push("name");
    if(!email.trim()) validation.push("email");
    if(!whatsapp.trim()) validation.push("whatsapp");
    if(uf === "0") validation.push("uf");
    if(city === "0") validation.push("city");
    if(latitude === 0) validation.push("latitude");
    if(longitude === 0) validation.push("longitude");
    if (items.length === 0) validation.push("items");

    if(validation.length > 0){
      validation.forEach((element)=>{
        showErrorToast(element);
      });
      return;
    }

    const data = new FormData();
    data.append('name', name);
    data.append('email', email);
    data.append('whatsapp', whatsappSend);
    data.append('uf', uf);
    data.append('city', city);
    data.append('latitude', String(latitude));
    data.append('longitude', String(longitude));
    data.append('items', items.join(','));

    if(selectedFile){
      data.append('image', selectedFile);
    }

    try {
      await api.post('points', data);
      toast.success('Cadastro realizado com Sucesso!', {
        autoClose: 2500,
        position: "top-center",
        });
      setTimeout(() => {
        history.push("/");
      }, 3000);
    } catch (error) {
      if (error.response) {
        if(error.response.data.validation){
          error.response.data.validation.keys.forEach((element: string) => {
            showErrorToast(element);
          });
        }
      } else if (error.request) {
        console.log(error.request);
      } else {
        console.log('Error', error.message);
      }
    }

    function showErrorToast(element: string) {
      switch (element) {
        case "name":
          toast.error("Informe o nome!");
          break;
        case "email":
          toast.error("Informe o e-mail!");
          break;
        case "whatsapp":
          toast.error("Informe o whatsapp!");
          break;
        case "latitude":
          toast.error("Selecione um ponto no mapa!");
          break;
        case "uf":
          toast.error("Selecione o estado!");
          break;
        case "city":
          toast.error("Selecione a cidade!");
          break;
        case "image":
          toast.error("Selecione a imagem!");
          break;
        case "items":
          toast.error("Selecione ao menos 1 item!");
          break;
        default: 
          return;
      }
    }
  }

  return (
    <div id="page-create-point">   
      <header>
        <img src={logo} alt="Ecoleta"/>
        <Link to="/">
          <FiArrowLeft />
          Voltar para home
        </Link>
      </header>

      <ToastContainer />

      <form onSubmit={handleSubmit}>

        <h1>Cadastro do <br /> ponto de coleta</h1>

        <Dropzone onFileUploaded={setSelectedFile}/>
        
        <fieldset>
          <legend>
            <h2>Dados</h2>
          </legend>
          <div className="field">
            <label htmlFor="name">Nome da entidade</label>
            <input 
              type="text"
              name="name"
              id="name"
              required
              onChange={handleInputChange}
            />
          </div>

          <div className="field-group">
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input 
                type="email"
                name="email"
                id="email"
                required
                onChange={handleInputChange}
              />
            </div>
            <div className="field">
              <label htmlFor="whatsapp">Whatsapp</label>
              <MaskedInput 
                name="whatsapp"
                id="whatsapp"
                required
                mask={['(', /\d/, /\d/, ')', ' ', /\d/, ' ', /\d/, /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/]}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <h2>Endereço</h2>
            <span>Selecione o endereço no mapa</span>
          </legend>

          <Map center={initialPosition} zoom={15} onClick={handleMapClick}> 
            <TileLayer
              attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={selectedPosition} />
          </Map>

          <div className="field-group">
            <div className="field">
              <label htmlFor="uf">Estado (UF)</label>
              <select 
                name="uf" 
                id="uf"
                required 
                value={selectedUf} 
                onChange={handleSelectUf}
              >
                <option value="0">Selecione uma UF</option>
                {ufs.map(
                  uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  )
                )}
              </select>
            </div>
            <div className="field">
              <label htmlFor="city">Cidade</label>
              <select 
                name="city" 
                id="city"
                required
                value={selectedCity} 
                onChange={handleSelectCity}
              >
                <option value="0">Selecione uma cidade</option>
                {cities.map(
                  city => (
                    <option key={city} value={city}>{city}</option>
                  )
                )}
              </select>
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>
            <h2>Ítens de coleta</h2>
            <span>Selecione um ou mais ítens abaixo</span>
          </legend>

          <ul className="items-grid">
            {items.map(item => (
              <li 
                key={item.id} 
                onClick={() => handleSelectItem(item.id)}
                className={selectedItems.includes(item.id) ? 'selected' : ''}
              >
                <img src={item.image_url} alt={item.title}/>
                <span>{item.title}</span>
              </li>
            ))}
            
          </ul>
        </fieldset>

      <div className="field-group">
          <div className="field">
            <label id="label-required">Todos os itens são obrigatório o preenchimento.</label>
          </div>
          <div className="field">
            <button type="submit">
              Cadastrar ponto de coleta 
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePoint;