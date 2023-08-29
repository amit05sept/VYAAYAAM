'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [latitude,longitude]
    this.distance = distance; // in km
    this.duration = duration; // in minutes
  }

  //setting the discription
  _setDescription() {

  // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click(){
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    //calling the function for calculating the pace.
    this.#calcPace();

    //setting the discription
    this._setDescription();
  }
  #calcPace() {
    //pace = time / distance;
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    //calling the function for speed
    this.calcSpeed();

    //setting the discription
    this._setDescription();
  }

  calcSpeed() {
    // speed = distance / time
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  //prvate fields.
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    //get the user location
    this.#getPosition();

    //get data from local storage
    this.#getLocalStorage();


    //seting the event Listeners
    form.addEventListener('submit', this.#newWorkouts.bind(this));

    //second event Listener
    inputType.addEventListener('change', this.#toggleElevationField);

    // thrid event listener for moving tha map
    containerWorkouts.addEventListener('click', this.#moveMapPos.bind(this));
  }

  //private methods
  #getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          alert('Unable to get your Location');
        }
      );
  }
  #loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    //initializing the map
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    const googleStreets = L.tileLayer(
      'http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}',
      {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }
    );
    googleStreets.addTo(this.#map);

    this.#map.on('click', this.#showForm.bind(this)); 
    

    // loading the workout from local storage
    // to the map
    this.#workouts.forEach(work =>{
        this.#renderWorkoutOnMap(work);
    });
  }
  #showForm(mapE) {
    form.classList.remove('hidden');
    // console.log(this);
    inputDistance.focus();
    this.#mapEvent = mapE;
  }
  #toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #hideForm() {
    // clearing the input fields
    inputDuration.value =
      inputCadence.value =
      inputElevation.value =
      inputDistance.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');

    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  //adds a new workout to the map
  #newWorkouts(e) {
    e.preventDefault();
    //validation of the data in the form
    //function to validate the inputs
    const isValidInput = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    // checking if all the input is positive or not
    const isInputsPositive = (...inputs) => inputs.every(inp => inp > 0);

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !isValidInput(distance, duration, cadence) ||
        !isInputsPositive(distance, duration, cadence)
      )
        return alert('Entries must be a positive number');

      //creating a new workout
      workout = new Running(coords, distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !isValidInput(distance, duration, elevation) ||
        !isInputsPositive(distance, duration)
      )
        return alert('Entries must be a positive number');


      // creating a new workout object
      workout = new Cycling(coords, distance, duration, elevation);
    }

    //adding the workout to workouts array
    this.#workouts.push(workout);

    //display marker on the coordinates.
    //rendreing the workout on the map
    this.#renderWorkoutOnMap(workout);

    //rendering the workout in the list
    this.#renderWorkoutOnList(workout);

    //hiding out the form
    this.#hideForm();

    //set local storage for the workout
    this.#setLocalStorage();
  }

  #renderWorkoutOnMap(workout) {
    // console.log(workout.coords);
    L.marker(workout.coords, { riseOnHover: true })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  #renderWorkoutOnList(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
     <h2 class="workout__title">${workout.description}</h2>
     <div class="workout__details">
       <span class="workout__icon">${
         workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
       }</span>
       <span class="workout__value">${workout.distance}</span>
       <span class="workout__unit">km</span>
     </div>
     <div class="workout__details">
       <span class="workout__icon">⏱</span>
       <span class="workout__value">${workout.duration}</span> 
       <span class="workout__unit">min</span>
     </div>
    `;

    if (workout.type === 'running')
      html += `
     <div class="workout__details">
         <span class="workout__icon">⚡️</span>
         <span class="workout__value">${workout.pace.toFixed(1)}</span>
         <span class="workout__unit">min/km</span>
       </div>
       <div class="workout__details">
         <span class="workout__icon">🦶🏼</span>
         <span class="workout__value">${workout.cadence}</span>
         <span class="workout__unit">spm</span>
       </div>
     </li>
    `;

    if (workout.type === 'cycling')
      html += `
     <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
     </div>
     <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
     </div>
    </li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  //moving the map on the click
  #moveMapPos(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    ); // returns the element  and not the index of it.

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  //set local storage method
  #setLocalStorage(){
    localStorage.setItem('workout',  JSON.stringify(this.#workouts));
     
  }

  //get from local storage method
  #getLocalStorage(){
    const data = JSON.parse(localStorage.getItem('workout'));

    if(!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work =>{
        this.#renderWorkoutOnList(work);
    });

  }

  //reseting the localStorage
  reset(){
    localStorage.removeItem('workout');
    location.reload();
  }
}

const app = new App();
