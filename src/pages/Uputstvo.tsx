export default function Uputstvo() {
  return (
    <article className="max-w-2xl mx-auto paper-card p-6 prose prose-stone">
      <h1 className="text-3xl mb-4">Упутство</h1>
      <ol className="list-decimal pl-5 space-y-2 text-foreground">
        <li>На <strong>Почетној</strong> можеш претраживати по речи, дефиницији или синониму.</li>
        <li>Кликни на слово азбуке или на категорију да видиш листу одредница.</li>
        <li>Свака одредница приказује акцентовани облик, граматичке ознаке и нумерисана значења са примерима — у SANU стилу.</li>
        <li>Ознака <span className="sanu-badge">SANU</span> значи да унос потиче из верификованог SANU корпуса и приказује се пре осталих.</li>
        <li>Речник ради и без интернета — после прве посете је цео сачуван у твом прегледачу.</li>
        <li>На страни <strong>Управљање</strong> можеш извести базу или је ресетовати.</li>
      </ol>
    </article>
  );
}
